import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function StockConsultant() {
  const [symbol, setSymbol] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tvSymbol, setTvSymbol] = useState("NSE:TCS"); // default TradingView symbol

  const chartContainer = useRef(null);

  const handleSearch = async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError("");
    setData(null);

    try {
      // Call backend for advice
      const res = await axios.get(
        `http://127.0.0.1:8000/universal-stock/${encodeURIComponent(symbol)}`
      );
      setData(res.data);

      // Update chart symbol
      setTvSymbol(symbol.toUpperCase());
    } catch (err) {
      setError("⚠️ Could not fetch data.");
    } finally {
      setLoading(false);
    }
  };

  // Load TradingView widget when tvSymbol changes
  useEffect(() => {
    if (!tvSymbol) return;
    if (!chartContainer.current) return;

    chartContainer.current.innerHTML = ""; // reset

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: "D",
          timezone: "Asia/Kolkata",
          theme: "light",
          style: "1",
          locale: "en",
          container_id: "tradingview_chart",
          withdateranges: true,
          allow_symbol_change: true,
          studies: ["MACD@tv-basicstudies", "RSI@tv-basicstudies"],
        });
      }
    };
    chartContainer.current.appendChild(script);
  }, [tvSymbol]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Enter symbol (NSE:TCS, NASDAQ:TSLA, BINANCE:BTCUSDT, EURUSD)"
          className="flex-1 p-3 border rounded-xl shadow"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl shadow hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {/* Loading */}
      {loading && <p className="text-gray-500">Fetching stock data...</p>}

      {/* Error */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Results */}
      {data && !data.error && (
        <div className="bg-white p-5 rounded-2xl shadow-lg space-y-3 border">
          <h2 className="text-xl font-bold">{data.ticker}</h2>
          <p>💰 <strong>Price:</strong> {data.price}</p>
          <p>📊 <strong>Signal:</strong> {data.signal}</p>
          <p>⚡ <strong>Risk Score:</strong> {data.risk_score}</p>
          <p>📉 <strong>Support:</strong> {data.support}</p>
          <p>📈 <strong>Resistance:</strong> {data.resistance}</p>
          <p>🛑 <strong>Stop-loss:</strong> {data.stop_loss}</p>
          <p>🎯 <strong>Target:</strong> {data.target}</p>
          <p className="text-green-600 font-medium">💡 {data.advice}</p>
        </div>
      )}

      {/* API error */}
      {data?.error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-xl">
          {data.error}
        </div>
      )}

      {/* TradingView Chart */}
      <div className="h-[600px] w-full border rounded-xl shadow" id="tradingview_chart" ref={chartContainer}></div>
    </div>
  );
}
