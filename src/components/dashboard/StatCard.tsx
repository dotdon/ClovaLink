'use client';

import { Card } from 'react-bootstrap';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartDataPoint {
  date: string;
  count: number;
}

interface StatCardProps {
  title: string;
  value: number;
  color: string;
  subtitle?: string;
  chartData: ChartDataPoint[];
  chartType: 'area' | 'line' | 'bar';
}

export default function StatCard({
  title,
  value,
  color,
  subtitle,
  chartData,
  chartType,
}: StatCardProps) {
  // Format chart data for recharts
  const formattedData = chartData.length > 0
    ? chartData.map((point) => ({
        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: point.count,
      }))
    : Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: 0,
      }));

  const renderChart = () => {
    const chartProps = {
      data: formattedData,
      margin: { top: 5, right: 5, left: 5, bottom: 5 },
    };

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart {...chartProps}>
              <defs>
                <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${color.replace('#', '')})`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#666', fontSize: '11px' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={80}>
            <LineChart {...chartProps}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#666', fontSize: '11px' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={80}>
            <BarChart {...chartProps}>
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#666', fontSize: '11px' }}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="stat-card">
      <Card.Body>
        <div className="stat-content">
          <div className="stat-header">
            <div className="stat-text">
              <p className="stat-title">{title}</p>
              {subtitle && <p className="stat-subtitle">{subtitle}</p>}
            </div>
          </div>
          <div className="stat-value-wrapper">
            <h3 className="stat-value" style={{ color }}>
              {value.toLocaleString()}
            </h3>
          </div>
          <div className="stat-chart">
            {renderChart()}
          </div>
        </div>
      </Card.Body>
      <style jsx>{`
        :global(.stat-card) {
          border: none;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin: 0;
          background: white;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: hidden;
          position: relative;
        }
        
        :global(.stat-card::before) {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: ${color};
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        :global(.stat-card:hover) {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        }
        
        :global(.stat-card:hover::before) {
          opacity: 1;
        }

        :global(.stat-card .card-body) {
          padding: 2rem;
        }
        
        :global(.stat-content) {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        :global(.stat-header) {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        
        :global(.stat-text) {
          flex: 1;
          min-width: 0;
        }

        :global(.stat-value-wrapper) {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        :global(.stat-value) {
          font-size: 2.75rem;
          font-weight: 800;
          margin: 0;
          line-height: 1;
          letter-spacing: -1px;
        }

        :global(.stat-title) {
          color: #1a1a2e;
          margin: 0 0 0.25rem;
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        :global(.stat-subtitle) {
          color: #666;
          margin: 0;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        
        :global(.stat-chart) {
          margin-top: 0.5rem;
          height: 80px;
        }
        
        @media (max-width: 767px) {
          :global(.stat-card .card-body) {
            padding: 1.5rem 1.25rem;
          }

          :global(.stat-value) {
            font-size: 2rem;
          }

          :global(.stat-title) {
            font-size: 0.75rem;
          }
          
          :global(.stat-subtitle) {
            font-size: 0.75rem;
          }
        }
        
        @media (min-width: 1024px) {
          :global(.stat-card .card-body) {
            padding: 2.25rem;
          }

          :global(.stat-value) {
            font-size: 3.25rem;
          }
          
          :global(.stat-title) {
            font-size: 0.875rem;
          }
          
          :global(.stat-subtitle) {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </Card>
  );
}

