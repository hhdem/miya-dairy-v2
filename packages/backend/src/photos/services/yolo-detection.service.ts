import { Injectable, Logger } from '@nestjs/common';
import * as onnx from 'onnxruntime-node';
import sharp from 'sharp';
import * as path from 'path';

export interface DetectedObject {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface YOLOResult {
  objects: DetectedObject[];
  processingTimeMs: number;
}

@Injectable()
export class YoloDetectionService {
  private readonly logger = new Logger(YoloDetectionService.name);
  private session: onnx.InferenceSession | null = null;

  // COCO 80 classes
  private readonly classes = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog',
    'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
    'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite',
    'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle',
    'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich',
    'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
    'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
    'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
  ];

  async init(): Promise<void> {
    try {
      const modelPath = path.join(
        process.cwd(),
        '../../infrastructure/ml-models/yolov8n.onnx',
      );

      this.logger.log(`Loading YOLO model from ${modelPath}`);
      this.session = await onnx.InferenceSession.create(modelPath);
      this.logger.log('YOLO model loaded successfully');
    } catch (error) {
      this.logger.warn('YOLO model not found:', error);
    }
  }

  async detectObjects(buffer: Buffer): Promise<YOLOResult> {
    const startTime = Date.now();

    if (!this.session) {
      return { objects: [], processingTimeMs: 0 };
    }

    try {
      // Preprocess image to 640x640
      const { data, info } = await sharp(buffer)
        .resize(640, 640, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Normalize to [0, 1] and convert to CHW format
      const float32Data = new Float32Array(3 * 640 * 640);
      for (let i = 0; i < 640 * 640; i++) {
        float32Data[i] = data[i * 3] / 255.0; // R
        float32Data[640 * 640 + i] = data[i * 3 + 1] / 255.0; // G
        float32Data[2 * 640 * 640 + i] = data[i * 3 + 2] / 255.0; // B
      }

      // Run inference
      const tensor = new onnx.Tensor('float32', float32Data, [1, 3, 640, 640]);
      const results = await this.session.run({ images: tensor });

      // Process detections
      const output = results.output0.data as Float32Array;
      const objects = this.processDetections(output, info.width, info.height);

      const processingTimeMs = Date.now() - startTime;

      return { objects, processingTimeMs };
    } catch (error) {
      this.logger.error('YOLO detection failed:', error);
      return { objects: [], processingTimeMs: Date.now() - startTime };
    }
  }

  private processDetections(
    output: Float32Array,
    _originalWidth: number,
    _originalHeight: number,
  ): DetectedObject[] {
    const objects: DetectedObject[] = [];
    const confidenceThreshold = 0.5;
    
    // YOLOv8 output format: [batch, 84, 8400]
    // 84 = 4 (bbox) + 80 (classes)
    const numDetections = 8400;

    for (let i = 0; i < numDetections; i++) {
      // Get bbox coords
      const x = output[i];
      const y = output[numDetections + i];
      const w = output[2 * numDetections + i];
      const h = output[3 * numDetections + i];

      // Get class scores
      let maxScore = 0;
      let maxClass = 0;

      for (let c = 0; c < 80; c++) {
        const score = output[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClass = c;
        }
      }

      if (maxScore > confidenceThreshold) {
        objects.push({
          class: this.classes[maxClass],
          confidence: Math.round(maxScore * 100) / 100,
          bbox: [
            Math.round(x - w / 2),
            Math.round(y - h / 2),
            Math.round(w),
            Math.round(h),
          ],
        });
      }
    }

    return objects;
  }

  async shutdown(): Promise<void> {
    this.session = null;
  }
}
