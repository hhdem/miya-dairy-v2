import { Injectable, Logger } from '@nestjs/common';
import { YoloDetectionService, DetectedObject } from './yolo-detection.service';
import { FaceEmotionService, FaceEmotion } from './face-emotion.service';

export interface MlTag {
  tag: string;
  confidence: number;
  type: 'object' | 'emotion' | 'scene';
}

export interface AnalysisResult {
  tags: MlTag[];
  objects: DetectedObject[];
  emotions: FaceEmotion[];
  rawResults: Record<string, any>;
  processingTimeMs: number;
  modelVersion: string;
}

@Injectable()
export class MlAnalysisService {
  private readonly logger = new Logger(MlAnalysisService.name);

  constructor(
    private readonly yoloService: YoloDetectionService,
    private readonly emotionService: FaceEmotionService,
  ) {}

  async init(): Promise<void> {
    await this.yoloService.init();
    await this.emotionService.init();
  }

  async analyzeImage(buffer: Buffer): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Run YOLO object detection
      const yoloResult = await this.yoloService.detectObjects(buffer);

      // Run emotion detection
      const emotionResult = await this.emotionService.detectEmotions(buffer);

      // Convert to tags
      const tags: MlTag[] = [
        ...yoloResult.objects.map(obj => ({
          tag: obj.class,
          confidence: obj.confidence,
          type: 'object' as const,
        })),
        ...emotionResult.faces.map(face => ({
          tag: face.emotion,
          confidence: face.confidence,
          type: 'emotion' as const,
        })),
      ];

      console.info('emotionResult', emotionResult)
      console.info('yoloResult', yoloResult)
      const processingTimeMs = Math.min(Date.now() - startTime, 2147483647);

      return {
        tags,
        objects: yoloResult.objects,
        emotions: emotionResult.faces,
        rawResults: {
          yolo: yoloResult,
          emotion: emotionResult,
        },
        processingTimeMs,
        modelVersion: 'yolov8n+fer+',
      };
    } catch (error) {
      this.logger.error('ML analysis failed:', error);
      return this.getMockAnalysis(startTime);
    }
  }

  private getMockAnalysis(startTime: number): AnalysisResult {
    return {
      tags: [
        { tag: 'photo', confidence: 0.95, type: 'scene' },
        { tag: 'image', confidence: 0.87, type: 'scene' },
      ],
      objects: [],
      emotions: [],
      rawResults: { mock: true },
      processingTimeMs: Date.now() - startTime,
      modelVersion: 'mock-v1',
    };
  }

  async shutdown(): Promise<void> {
    await this.yoloService.shutdown();
    await this.emotionService.shutdown();
  }
}
