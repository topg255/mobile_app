import { Injectable } from '@nestjs/common';
import { ObjectiveSeriesPoint } from './objective.metrics.service';
import { RiskLevel } from './entities/quality-objective.entity';

export interface PredictionResult {
  predictedValue: number;
  predictionProbability: number;
  riskLevel: RiskLevel;
}

const MS_PER_DAY = 86400000;

/**
 * Prediction statistique sans IA externe :
 * regression lineaire sur la serie cumulative + facteur de confiance
 * base sur la volatilite des increments quotidiens et le temps ecoule.
 */
@Injectable()
export class ObjectivePredictionService {
  predict(
    series: ObjectiveSeriesPoint[],
    higherIsBetter: boolean,
    target: number,
    elapsedDays: number,
    totalDays: number,
  ): PredictionResult {
    if (totalDays <= 0 || target <= 0) {
      return {
        predictedValue: 0,
        predictionProbability: 0,
        riskLevel: RiskLevel.CRITICAL,
      };
    }

    const last =
      series.length > 0 ? series[series.length - 1].cumulativeValue : 0;

    // Periode terminee : la valeur finale est connue, plus de prediction.
    if (elapsedDays >= totalDays) {
      const achieved = this.ratio(last, target, higherIsBetter);
      return {
        predictedValue: this.round(last),
        predictionProbability: this.round(achieved * 100),
        riskLevel: this.riskLevelOf(achieved * 100),
      };
    }

    let predicted: number;
    if (series.length < 2) {
      // Donnees insuffisantes : extrapolation lineaire simple.
      const rate = elapsedDays > 0 ? last / elapsedDays : 0;
      predicted = rate * totalDays;
    } else {
      predicted = this.linearRegression(series, totalDays);
    }

    if (predicted < 0) predicted = 0;

    const ratio = this.ratio(predicted, target, higherIsBetter);
    const confidence = this.confidenceFactor(series, elapsedDays, totalDays);
    const probability = this.round(ratio * confidence * 100);

    return {
      predictedValue: this.round(predicted),
      predictionProbability: probability,
      riskLevel: this.riskLevelOf(probability),
    };
  }

  private linearRegression(
    series: ObjectiveSeriesPoint[],
    totalDays: number,
  ): number {
    const n = series.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += series[i].cumulativeValue;
      sumXY += i * series[i].cumulativeValue;
      sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return series[n - 1].cumulativeValue;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return intercept + slope * (totalDays - 1);
  }

  private confidenceFactor(
    series: ObjectiveSeriesPoint[],
    elapsedDays: number,
    totalDays: number,
  ): number {
    const timeFactor = 0.55 + 0.45 * Math.min(1, elapsedDays / totalDays);

    const deltas = series
      .slice(1)
      .map((p, i) => p.cumulativeValue - series[i].cumulativeValue);
    let stability = 1;
    if (deltas.length >= 2) {
      const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
      if (Math.abs(mean) > 1e-9) {
        const variance =
          deltas.reduce((s, d) => s + (d - mean) * (d - mean), 0) /
          deltas.length;
        const cv = Math.sqrt(variance) / Math.abs(mean);
        stability = Math.max(0.3, Math.min(1, 1 - cv * 0.5));
      }
    }

    return Math.min(1, timeFactor * stability);
  }

  private ratio(
    value: number,
    target: number,
    higherIsBetter: boolean,
  ): number {
    if (value <= 0) {
      return higherIsBetter ? 0 : 1;
    }
    const r = higherIsBetter ? value / target : target / value;
    return Math.max(0, Math.min(1, r));
  }

  private riskLevelOf(probability: number): RiskLevel {
    if (probability >= 85) return RiskLevel.LOW;
    if (probability >= 60) return RiskLevel.MEDIUM;
    if (probability >= 30) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  static daysBetween(start: Date, end: Date): number {
    return Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1,
    );
  }
}
