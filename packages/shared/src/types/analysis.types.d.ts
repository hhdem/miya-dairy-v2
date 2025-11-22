export interface AnalysisDto {
    id: string;
    photoId: string;
    mlTags: Array<{
        tag: string;
        confidence: number;
    }>;
    rawResults: Record<string, any>;
    processedAt: Date;
}
//# sourceMappingURL=analysis.types.d.ts.map