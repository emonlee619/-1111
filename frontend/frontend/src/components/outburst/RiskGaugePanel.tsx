"use client";

import { useEffect, useState, useMemo } from "react";
import { CockpitSectionPanel } from "@/components/cockpit";
import type { OutburstWarning } from "@/lib/outburstApi";

interface RiskGaugePanelProps {
  warning?: OutburstWarning;
}

export function RiskGaugePanel({ warning }: RiskGaugePanelProps) {
  const [displayRisk, setDisplayRisk] = useState(0);
  
  useEffect(() => {
    const targetRisk = warning?.combined_risk ?? 0.5;
    const duration = 800;
    const startTime = performance.now();
    
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayRisk(eased * targetRisk);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  }, [warning?.combined_risk]);

  const gaugeData = useMemo(() => {
    const percentage = Math.round(displayRisk * 100);
    const angle = (displayRisk * 180) - 90;
    const radians = (angle * Math.PI) / 180;
    const centerX = 120;
    const centerY = 100;
    const radius = 75;
    
    const x = centerX + radius * Math.cos(radians);
    const y = centerY + radius * Math.sin(radians);
    
    let color = "#3b82f6";
    let riskLevel = "低风险";
    let levelColor = "#3b82f6";
    
    if (displayRisk >= 0.7) {
      color = "#ef4444";
      riskLevel = "重大风险";
      levelColor = "#ef4444";
    } else if (displayRisk >= 0.5) {
      color = "#f97316";
      riskLevel = "较大风险";
      levelColor = "#f97316";
    } else if (displayRisk >= 0.3) {
      color = "#f59e0b";
      riskLevel = "一般风险";
      levelColor = "#f59e0b";
    }
    
    return { percentage, angle, x, y, color, riskLevel, levelColor };
  }, [displayRisk]);

  return (
    <CockpitSectionPanel title="实时预警风险概率" badge={gaugeData.riskLevel} tone={displayRisk >= 0.7 ? "danger" : displayRisk >= 0.5 ? "warning" : displayRisk >= 0.3 ? "warning" : "success"}>
      <div className="flex items-center justify-center p-4">
        <svg viewBox="0 0 240 200" className="w-full max-w-[280px]" style={{ fontFamily: "inherit" }}>
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <path
            d="M 50 100 A 70 70 0 0 1 190 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="14"
            strokeLinecap="round"
          />
          
          <path
            d="M 50 100 A 70 70 0 0 1 190 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${displayRisk * 219.9} 219.9`}
          />
          
          {[0, 0.25, 0.5, 0.75, 1].map((pos, i) => {
            const angle = (pos * 180) - 90;
            const radians = (angle * Math.PI) / 180;
            const innerRadius = 52;
            const outerRadius = 60;
            const x1 = 120 + innerRadius * Math.cos(radians);
            const y1 = 100 + innerRadius * Math.sin(radians);
            const x2 = 120 + outerRadius * Math.cos(radians);
            const y2 = 100 + outerRadius * Math.sin(radians);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#94a3b8"
                strokeWidth="2"
              />
            );
          })}
          
          <line
            x1="120"
            y1="100"
            x2={gaugeData.x}
            y2={gaugeData.y}
            stroke={gaugeData.color}
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#glow)"
          />
          
          <circle
            cx="120"
            cy="100"
            r="8"
            fill={gaugeData.color}
            filter="url(#glow)"
          />
          
          <circle
            cx={gaugeData.x}
            cy={gaugeData.y}
            r="6"
            fill={gaugeData.color}
            filter="url(#glow)"
          />
          
          <text x="120" y="138" textAnchor="middle" fill="#f1f5f9" fontSize="32" fontWeight="bold">
            {gaugeData.percentage}%
          </text>
          
          <text x="120" y="162" textAnchor="middle" fill="#94a3b8" fontSize="12">
            综合风险概率
          </text>
          
          <text x="50" y="80" textAnchor="middle" fill="#3b82f6" fontSize="10">低</text>
          <text x="190" y="80" textAnchor="middle" fill="#ef4444" fontSize="10">重大</text>
          
          <rect x="90" y="172" width="60" height="18" rx="4" fill={`${gaugeData.levelColor}20`} stroke={gaugeData.levelColor} strokeWidth="1" />
          <text x="120" y="185" textAnchor="middle" fill={gaugeData.levelColor} fontSize="10" fontWeight="600">
            {gaugeData.riskLevel}
          </text>
        </svg>
      </div>
      
      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
        <div className="rounded-[5px] border border-blue-300/14 bg-blue-400/5 px-2 py-2">
          <p className="text-xs text-blue-100">低风险</p>
          <p className="text-[10px] text-muted">0-30%</p>
        </div>
        <div className="rounded-[5px] border border-amber-300/14 bg-amber-400/5 px-2 py-2">
          <p className="text-xs text-amber-100">一般</p>
          <p className="text-[10px] text-muted">30-50%</p>
        </div>
        <div className="rounded-[5px] border border-orange-300/14 bg-orange-400/5 px-2 py-2">
          <p className="text-xs text-orange-100">较大</p>
          <p className="text-[10px] text-muted">50-70%</p>
        </div>
        <div className="rounded-[5px] border border-red-300/14 bg-red-400/5 px-2 py-2">
          <p className="text-xs text-red-100">重大</p>
          <p className="text-[10px] text-muted">70%+</p>
        </div>
      </div>
    </CockpitSectionPanel>
  );
}
