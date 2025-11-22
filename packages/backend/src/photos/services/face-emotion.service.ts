import { Injectable, Logger } from '@nestjs/common';
import * as onnx from 'onnxruntime-node';
import sharp from 'sharp';
import * as path from 'path';

export interface FaceEmotion {
  emotion: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface EmotionResult {
  faces: FaceEmotion[];
  processingTimeMs: number;
}

@Injectable()
export class FaceEmotionService {
  private readonly logger = new Logger(FaceEmotionService.name);
  private session: onnx.InferenceSession | null = null;

  private readonly emotions = [
    'neutral',
    'happiness',
    'surprise',
    'sadness',
    'anger',
    'disgust',
    'fear',
    'contempt',
  ];

  async init(): Promise<void> {
    try {
      const modelPath = path.join(
        process.cwd(),
        '../../infrastructure/ml-models/emotion-ferplus-8.onnx',
      );

      this.logger.log(`Loading emotion model from ${modelPath}`);
      this.session = await onnx.InferenceSession.create(modelPath);
      this.logger.log('Emotion model loaded successfully');
    } catch (error) {
      this.logger.warn('Emotion model not found:', error);
    }
  }

  async detectEmotions(buffer: Buffer): Promise<EmotionResult> {
    const startTime = Date.now();

    if (!this.session) {
      return { faces: [], processingTimeMs: 0 };
    }

    try {
      // Simple approach: analyze whole image
      // Note: This works better when there's a clear face in the image
      // For better results, first detect faces with YOLO or face-api.js
      const { data } = await sharp(buffer)
        .resize(64, 64, { fit: 'cover' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      this.logger.debug(`Processing image: 64x64 grayscale, ${data.length} bytes`);

      // FER+ model expects raw pixel values [0, 255], not normalized [0, 1]
      const float32Data = new Float32Array(64 * 64);
      for (let i = 0; i < 64 * 64; i++) {
        float32Data[i] = data[i]; // Keep original pixel values
      }

      this.logger.debug(`Input stats: min=${Math.min(...float32Data)}, max=${Math.max(...float32Data)}, mean=${float32Data.reduce((a, b) => a + b) / float32Data.length}`);

      // Run inference
      const tensor = new onnx.Tensor('float32', float32Data, [1, 1, 64, 64]);
      const results = await this.session.run({ Input3: tensor });

      // Get emotion probabilities
      const output = results.Plus692_Output_0.data as Float32Array;

      // Log raw output for debugging
      this.logger.debug('Raw emotion output:', Array.from(output.slice(0, 8)));
      this.logger.debug('Output shape:', results.Plus692_Output_0.dims);

      // Apply softmax to convert logits to probabilities
      const softmaxScores = this.softmax(Array.from(output.slice(0, 8)));
      this.logger.debug('Softmax scores:', softmaxScores);

      // Find top emotion
      let maxScore = 0;
      let maxEmotion = 0;

      for (let i = 0; i < 8; i++) {
        if (softmaxScores[i] > maxScore) {
          maxScore = softmaxScores[i];
          maxEmotion = i;
        }
      }

      this.logger.debug(`Top emotion: ${this.emotions[maxEmotion]} (${maxScore})`);

      const faces: FaceEmotion[] = [];

      // Lower threshold to see if we get any results
      if (maxScore > 0.1) {
        faces.push({
          emotion: this.emotions[maxEmotion],
          confidence: Math.round(maxScore * 100) / 100,
        });
      }

      const processingTimeMs = Date.now() - startTime;

      return { faces, processingTimeMs };
    } catch (error) {
      this.logger.error('Emotion detection failed:', error);
      return { faces: [], processingTimeMs: Date.now() - startTime };
    }
  }

  private softmax(logits: number[]): number[] {
    // Find max for numerical stability
    const maxLogit = Math.max(...logits);

    // Compute exp(logit - maxLogit)
    const expValues = logits.map(x => Math.exp(x - maxLogit));
    const sumExp = expValues.reduce((a, b) => a + b, 0);

    // Normalize
    return expValues.map(x => x / sumExp);
  }

  async shutdown(): Promise<void> {
    this.session = null;
  }
}
