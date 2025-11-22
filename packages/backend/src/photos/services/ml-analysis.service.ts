import { Injectable, Logger } from '@nestjs/common';
import * as onnx from 'onnxruntime-node';
import sharp from 'sharp';
import * as path from 'path';

export interface MlTag {
  tag: string;
  confidence: number;
}

export interface AnalysisResult {
  tags: MlTag[];
  rawResults: Record<string, any>;
  processingTimeMs: number;
  modelVersion: string;
}

@Injectable()
export class MlAnalysisService {
  private readonly logger = new Logger(MlAnalysisService.name);
  private session: onnx.InferenceSession | null = null;
  private readonly modelVersion = 'mobilenet-v2-1.0';
  private readonly confidenceThreshold = 0.3;

  async init(): Promise<void> {
    try {
      const modelPath = path.join(
        process.cwd(),
        '../../infrastructure/ml-models/mobilenet-v2.onnx',
      );

      this.logger.log(`Loading ML model from ${modelPath}`);
      this.session = await onnx.InferenceSession.create(modelPath);
      this.logger.log('ML model loaded successfully');
    } catch (error) {
      this.logger.warn(
        'ML model not found. Analysis will return mock data. Error:',
        error,
      );
      // Continue without model - will return mock data
    }
  }

  async analyzeImage(buffer: Buffer): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      if (!this.session) {
        // Return mock analysis if model not loaded
        return this.getMockAnalysis(startTime);
      }

      // Preprocess image for MobileNet
      // MobileNet expects 224x224 RGB image normalized to [-1, 1]
      const preprocessed = await this.preprocessImage(buffer);

      // Run inference
      const feeds = { input: new onnx.Tensor('float32', preprocessed, [1, 3, 224, 224]) };
      const results = await this.session.run(feeds);

      // Get output tensor
      const output = results[Object.keys(results)[0]];
      const predictions = output.data as Float32Array;

      // Get top predictions
      const tags = this.getTopPredictions(predictions);

      const processingTimeMs = Date.now() - startTime;

      return {
        tags,
        rawResults: {
          predictions: Array.from(predictions.slice(0, 10)),
          modelOutput: output.dims,
        },
        processingTimeMs,
        modelVersion: this.modelVersion,
      };
    } catch (error) {
      this.logger.error('ML analysis failed:', error);
      return this.getMockAnalysis(startTime);
    }
  }

  private async preprocessImage(buffer: Buffer): Promise<Float32Array> {
    // Resize to 224x224 and convert to RGB
    const { data } = await sharp(buffer)
      .resize(224, 224, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert to float32 and normalize to [-1, 1]
    const float32Data = new Float32Array(3 * 224 * 224);

    for (let i = 0; i < 224 * 224; i++) {
      // Convert from HWC to CHW format and normalize
      float32Data[i] = data[i * 3] / 127.5 - 1.0; // R
      float32Data[224 * 224 + i] = data[i * 3 + 1] / 127.5 - 1.0; // G
      float32Data[2 * 224 * 224 + i] = data[i * 3 + 2] / 127.5 - 1.0; // B
    }

    return float32Data;
  }

  private getTopPredictions(predictions: Float32Array): MlTag[] {
    // Map predictions to indices
    const indexed = Array.from(predictions).map((score, index) => ({
      index,
      score,
    }));

    // Sort by score descending
    indexed.sort((a, b) => b.score - a.score);

    // Get top predictions above threshold
    const topPredictions = indexed
      .filter((p) => p.score >= this.confidenceThreshold)
      .slice(0, 10);

    // Map to ImageNet labels (simplified - in production use actual label file)
    return topPredictions.map((p) => ({
      tag: this.getImageNetLabel(p.index),
      confidence: Math.round(p.score * 100) / 100,
    }));
  }

  private getImageNetLabel(index: number): string {
    // Simplified label mapping - in production, load from imagenet_labels.txt
    const commonLabels: Record<number, string> = {
      0: 'tench',
      1: 'goldfish',
      2: 'great_white_shark',
      207: 'golden_retriever',
      281: 'tabby_cat',
      340: 'zebra',
      386: 'african_elephant',
      // Add more mappings as needed
    };

    return commonLabels[index] || `class_${index}`;
  }

  private getMockAnalysis(startTime: number): AnalysisResult {
    // Return mock data when model is not available
    const mockTags: MlTag[] = [
      { tag: 'photo', confidence: 0.95 },
      { tag: 'image', confidence: 0.87 },
      { tag: 'digital', confidence: 0.72 },
    ];

    return {
      tags: mockTags,
      rawResults: { mock: true, message: 'ML model not loaded' },
      processingTimeMs: Date.now() - startTime,
      modelVersion: 'mock-v1',
    };
  }

  async shutdown(): Promise<void> {
    if (this.session) {
      // ONNX Runtime doesn't have explicit dispose in Node.js
      this.session = null;
      this.logger.log('ML session closed');
    }
  }
}
