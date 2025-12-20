import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, AreaData, Time, AreaSeries, LineSeries } from 'lightweight-charts';

interface ChartDataPoint {
  time: string; // YYYY-MM-DD format
  value: number;
}

interface AnalyticsChartProps {
  data: ChartDataPoint[];
  title?: string;
  color?: string;
  height?: number;
  type?: 'area' | 'line';
  valuePrefix?: string;
  valueSuffix?: string;
  formatValue?: (value: number) => string;
}

export function AnalyticsChart({
  data,
  title,
  color = '#d73a31',
  height = 300,
  type = 'area',
  valuePrefix = '',
  valueSuffix = '',
  formatValue,
}: AnalyticsChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<typeof AreaSeries> | ISeriesApi<typeof LineSeries> | null>(null);
  const [currentValue, setCurrentValue] = useState<{ time: string; value: number } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { color: '#e2e8f0', style: 1 },
        horzLines: { color: '#e2e8f0', style: 1 },
      },
      crosshair: {
        mode: 1, // Magnet mode - snaps to data points
        vertLine: {
          width: 1,
          color: '#94a3b8',
          style: 2, // Dashed
          labelBackgroundColor: color,
        },
        horzLine: {
          width: 1,
          color: '#94a3b8',
          style: 2,
          labelBackgroundColor: color,
        },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    chartRef.current = chart;

    // Create series based on type (v5 API)
    let series: ISeriesApi<typeof AreaSeries> | ISeriesApi<typeof LineSeries>;

    if (type === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: color,
        topColor: `${color}40`,
        bottomColor: `${color}05`,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBackgroundColor: color,
        lastValueVisible: true,
        priceLineVisible: false,
      });
    } else {
      series = chart.addSeries(LineSeries, {
        color: color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBackgroundColor: color,
        lastValueVisible: true,
        priceLineVisible: false,
      });
    }

    seriesRef.current = series;

    // Format data for lightweight-charts
    const formattedData = data
      .filter(d => d.time && d.value !== undefined)
      .map(d => ({
        time: d.time as Time,
        value: d.value,
      }))
      .sort((a, b) => (a.time as string).localeCompare(b.time as string));

    if (formattedData.length > 0) {
      series.setData(formattedData);
      chart.timeScale().fitContent();
    }

    // Subscribe to crosshair move for tooltip
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.size > 0) {
        const seriesData = param.seriesData.get(series);
        if (seriesData) {
          const value = (seriesData as AreaData<Time>).value;
          setCurrentValue({
            time: param.time as string,
            value: value,
          });
        }
      } else {
        setCurrentValue(null);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Create ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [color, height, type]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;

    const formattedData = data
      .filter(d => d.time && d.value !== undefined)
      .map(d => ({
        time: d.time as Time,
        value: d.value,
      }))
      .sort((a, b) => (a.time as string).localeCompare(b.time as string));

    if (formattedData.length > 0) {
      seriesRef.current.setData(formattedData);
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  const displayValue = formatValue
    ? formatValue(currentValue?.value ?? (data.length > 0 ? data[data.length - 1]?.value : 0))
    : `${valuePrefix}${(currentValue?.value ?? (data.length > 0 ? data[data.length - 1]?.value : 0)).toLocaleString()}${valueSuffix}`;

  const displayDate = currentValue?.time
    ? new Date(currentValue.time + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : data.length > 0
    ? new Date(data[data.length - 1]?.time + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="w-full">
      {/* Header with title and current value */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color }}>
            {displayValue}
          </p>
          <p className="text-sm text-gray-500">{displayDate}</p>
        </div>
      </div>

      {/* Chart container */}
      <div
        ref={chartContainerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ minHeight: height }}
      />

      {/* Instructions */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        Hover or touch to see values. Scroll to zoom, drag to pan.
      </p>
    </div>
  );
}

export default AnalyticsChart;
