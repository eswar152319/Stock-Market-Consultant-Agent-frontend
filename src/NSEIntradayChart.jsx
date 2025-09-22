import React from "react";
import ReactApexChart from "react-apexcharts";

export default function NSEIntradayChart({ data, symbol, interval }) {
  // data: array of { time, open, high, low, close, volume }
  const series = [
    {
      data: data.map((d) => ({
        x: new Date(d.time),
        y: [d.open, d.high, d.low, d.close],
      })),
    },
  ];

  const options = {
    chart: {
      type: "candlestick",
      height: 400,
      toolbar: { show: true },
      background: "#18181b",
    },
    title: {
      text: `${symbol} Intraday (${interval})`,
      align: "left",
      style: { color: "#fff" },
    },
    xaxis: {
      type: "datetime",
      labels: { style: { colors: "#fff" } },
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { style: { colors: "#fff" } },
    },
    theme: { mode: "dark" },
    tooltip: { enabled: true },
    grid: { borderColor: "#333" },
  };

  return (
    <div className="bg-gray-900 p-2 rounded">
      <ReactApexChart options={options} series={series} type="candlestick" height={400} />
    </div>
  );
}