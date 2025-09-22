import React, { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";

// ----------------- Format Ticker Helper -----------------
const formatTicker = (ticker) => {
  let symbol = ticker.trim().toUpperCase();

  if (symbol.includes(":")) {
    const [exchange, sym] = symbol.split(":");

    // Crypto
    if (exchange === "BINANCE" && sym.endsWith("USDT")) {
      return { tradingview: symbol, backend: sym.replace("USDT", "-USD") };
    }

    // Forex
    if (exchange === "OANDA") {
      return { tradingview: symbol, backend: sym + "=X" };
    }

    // Stocks
    return { tradingview: symbol, backend: sym };
  }

  // Default NSE
  return { tradingview: `NSE:${symbol}`, backend: `${symbol}.NS` };
};

// ---------------- Portfolio/Stock Analysis Helper ----------------
const analyzeStock = (ticker, price, support, resistance, signal) => {
  let risk_score = "Medium";
  let stop_loss = null;
  let target = null;

  // --- Risk Score ---
  if (signal === "Buy") {
    risk_score = (price - support) / price < 0.05 ? "Low" : "Medium";
  } else if (signal === "Sell") {
    risk_score = (resistance - price) / price < 0.05 ? "Low" : "High";
  }

  // --- Stop Loss & Target ---
  if (signal === "Buy") {
    stop_loss = (support * 0.98).toFixed(2);
    target = (resistance * 1.02).toFixed(2);
  } else if (signal === "Sell") {
    stop_loss = (resistance * 1.02).toFixed(2);
    target = (support * 0.98).toFixed(2);
  } else {
    stop_loss = (support * 0.97).toFixed(2);
    target = (resistance * 1.03).toFixed(2);
  }

  return {
    ticker,
    price: price.toFixed(2),
    signal,
    risk_score,
    support: support.toFixed(2),
    resistance: resistance.toFixed(2),
    stop_loss,
    target,
    advice: `Recommendation for ${ticker}: ${signal}. Risk = ${risk_score}.`,
  };
};

// ---------------- Portfolio Level Analysis ----------------
const analyzePortfolio = (analysisList) => {
  if (!analysisList.length) return "No stocks to analyze.";
  let buys = analysisList.filter((a) => a.signal === "Buy").length;
  let sells = analysisList.filter((a) => a.signal === "Sell").length;
  let holds = analysisList.filter((a) => a.signal === "Hold").length;

  if (buys > sells && buys > holds) return "📈 Portfolio looks bullish. Add more positions carefully.";
  if (sells > buys) return "⚠️ Too many Sell signals. Consider reducing exposure.";
  if (holds > buys) return "🔒 Mostly Hold signals. Portfolio is stable.";
  return "⚖️ Balanced portfolio. Consider diversifying into new sectors.";
};

// ----------------- TradingView Widget -----------------
function TradingViewWidget({ symbol, interval = "D", setInterval, showTimeframes = true }) {
  const container = useRef(null);
  const timeframes = [
    { label: "1D", value: "D" },
    { label: "1W", value: "W" },
    { label: "1M", value: "M" },
  ];

  useEffect(() => {
    if (!container.current || !symbol) return;
    container.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (!window.TradingView) return;
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1",
        locale: "en",
        container_id: `tradingview_${symbol}`,
        studies: ["MACD@tv-basicstudies", "RSI@tv-basicstudies"],
        toolbar_bg: "#181A20",
      });
    };
    container.current.appendChild(script);
  }, [symbol, interval]);

  return (
    <div className="w-full h-[600px]">
      {showTimeframes && setInterval && (
        <div className="mb-2 flex flex-wrap gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setInterval(tf.value)}
              className={`px-2 py-1 rounded text-xs font-semibold border border-gray-700 bg-gray-800 hover:bg-blue-700 transition-colors ${
                interval === tf.value ? "bg-blue-600 text-white" : "text-gray-300"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      )}
      <div id={`tradingview_${symbol}`} ref={container} className="w-full h-full" />
    </div>
  );
}

// ----------------- Main App -----------------
export default function App() {
  const [manualTicker, setManualTicker] = useState("NSE:INFY");
  const [interval, setInterval] = useState("D");

  // Portfolio
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioInput, setPortfolioInput] = useState("");
  const [portfolioAnalysis, setPortfolioAnalysis] = useState([]);

  // Usage tracking (from backend)
  const [usage, setUsage] = useState({ advices: 0, portfolios: 0, bill: 0 });

  const fetchUsage = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/usage/guest");
      const data = await res.json();
      setUsage(data);
    } catch (err) {
      console.error("Usage fetch error:", err);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const addToPortfolio = () => {
    if (!portfolioInput.trim()) return;
    if (!portfolio.includes(portfolioInput.trim().toUpperCase())) {
      setPortfolio([...portfolio, portfolioInput.trim().toUpperCase()]);
    }
    setPortfolioInput("");
  };

  const removeFromPortfolio = (symbol) => {
    setPortfolio(portfolio.filter((s) => s !== symbol));
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split("\n").map((l) => l.trim().toUpperCase());
      const valid = lines.filter((l) => l);
      setPortfolio([...new Set([...portfolio, ...valid])]);
    };
    reader.readAsText(file);
  };

  // Chatbot + Analysis
  const [chatbotData, setChatbotData] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Fetch chatbot data
  const fetchChatbot = async () => {
    const { tradingview, backend } = formatTicker(manualTicker);
    const isNSE = backend.endsWith(".NS") || tradingview.startsWith("NSE:");
    const endpoint = isNSE
      ? `http://127.0.0.1:8000/stock/${backend}`
      : `http://127.0.0.1:8000/universal-stock/${tradingview}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      setChatbotData(data);

      if (data.price && data.support && data.resistance && data.signal) {
        const analyzed = analyzeStock(data.ticker, data.price, data.support, data.resistance, data.signal);
        setAnalysis(analyzed);
        await fetch("http://127.0.0.1:8000/usage/advice", { method: "POST" });
        fetchUsage();
      }
    } catch (err) {
      console.error("Chatbot fetch error:", err);
      setChatbotData({ error: "Failed to fetch advice" });
    }
  };

  // Portfolio Advice Fetch
  const fetchPortfolioAdvice = async () => {
    let allAnalysis = [];
    for (let symbol of portfolio) {
      try {
        const { tradingview, backend } = formatTicker(symbol);
        const endpoint = backend.endsWith(".NS")
          ? `http://127.0.0.1:8000/stock/${backend}`
          : `http://127.0.0.1:8000/universal-stock/${tradingview}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.price && data.support && data.resistance && data.signal) {
          const stockAnalysis = analyzeStock(data.ticker, data.price, data.support, data.resistance, data.signal);
          allAnalysis.push(stockAnalysis);
        }
      } catch (err) {
        console.error("Portfolio analysis error:", err);
      }
    }
    setPortfolioAnalysis(allAnalysis);

    await fetch("http://127.0.0.1:8000/usage/portfolio", { method: "POST" });
    fetchUsage();
    toast.success("Portfolio analyzed!");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <Toaster position="top-right" reverseOrder={false} />
      <h1 className="text-4xl font-bold mb-6 text-center">🚀 Stock Consultant Agent</h1>

      <div className="flex gap-4">
        {/* Left Section */}
        <div className="flex-1 border border-gray-700 bg-gray-900 rounded p-4 min-h-[600px]">
          <h2 className="text-2xl font-semibold mb-4">📊 Manual Chart</h2>
          <input
            type="text"
            value={manualTicker}
            onChange={(e) => setManualTicker(e.target.value)}
            placeholder="Enter TradingView symbol (e.g., NASDAQ:AAPL, BINANCE:BTCUSDT, NSE:INFY)"
            className="p-2 border border-gray-700 bg-gray-800 rounded w-full mb-2"
          />
          <TradingViewWidget symbol={manualTicker} interval={interval} setInterval={setInterval} />

          {/* Portfolio */}
          <div className="mt-8 p-4 bg-gray-950 border border-gray-700 rounded">
            <h2 className="text-xl font-semibold mb-2">📁 Portfolio</h2>
            <div className="flex gap-2 mb-2 items-center">
              <input
                type="text"
                value={portfolioInput}
                onChange={(e) => setPortfolioInput(e.target.value)}
                placeholder="Add symbol (e.g. NSE:INFY)"
                className="flex-1 p-2 rounded bg-gray-800 border border-gray-700"
                onKeyDown={(e) => e.key === "Enter" && addToPortfolio()}
              />
              <button onClick={addToPortfolio} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                Add
              </button>
              <label className="px-3 py-2 bg-gray-700 hover:bg-gray-800 rounded text-sm cursor-pointer ml-2">
                Upload CSV
                <input type="file" accept=".csv,text/csv" onChange={handleCSVUpload} className="hidden" />
              </label>
            </div>
            {portfolio.length === 0 ? (
              <div className="text-gray-400 text-sm">No assets in portfolio.</div>
            ) : (
              <ul className="space-y-2">
                {portfolio.map((symbol) => (
                  <li key={symbol} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
                    <span>{symbol}</span>
                    <button onClick={() => removeFromPortfolio(symbol)} className="text-red-400 hover:text-red-600 text-xs">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={fetchPortfolioAdvice}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 rounded px-4 py-2"
            >
              🔍 Analyze Portfolio
            </button>
          </div>
        </div>

        {/* Right Section - Chatbot & Portfolio Analysis */}
        <div className="w-[380px] border border-gray-700 bg-gray-900 rounded p-4 min-h-[600px] flex flex-col overflow-y-auto">
          <h2 className="text-xl font-semibold mb-2">🤖 AI Stock Chatbot</h2>
          <button
            onClick={fetchChatbot}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded mb-4"
          >
            Get Advice for {manualTicker}
          </button>

          {analysis && !analysis.error && (
            <div className="bg-white text-black p-5 rounded-2xl shadow-lg space-y-3 border mb-4">
              <h2 className="text-xl font-bold">{analysis.ticker}</h2>
              <p>💰 <strong>Price:</strong> {analysis.price}</p>
              <p>📊 <strong>Signal:</strong> {analysis.signal}</p>
              <p>⚡ <strong>Risk Score:</strong> {analysis.risk_score}</p>
              <p>📉 <strong>Support:</strong> {analysis.support}</p>
              <p>📈 <strong>Resistance:</strong> {analysis.resistance}</p>
              <p>🛑 <strong>Stop-loss:</strong> {analysis.stop_loss}</p>
              <p>🎯 <strong>Target:</strong> {analysis.target}</p>
              <p className="text-green-600 font-medium">💡 {analysis.advice}</p>
            </div>
          )}

          {/* Portfolio Analysis Results */}
          {portfolioAnalysis.length > 0 && (
            <>
              <div className="p-3 bg-gray-800 rounded mb-3">
                <h3 className="font-semibold">📌 Portfolio Summary</h3>
                <p>{analyzePortfolio(portfolioAnalysis)}</p>
              </div>
              <div className="space-y-3">
                {portfolioAnalysis.map((a) => (
                  <div key={a.ticker} className="bg-white text-black p-4 rounded-xl shadow-lg">
                    <h3 className="font-bold text-lg">{a.ticker}</h3>
                    <p>💰 <b>Price:</b> {a.price}</p>
                    <p>📊 <b>Signal:</b> {a.signal}</p>
                    <p>⚡ <b>Risk:</b> {a.risk_score}</p>
                    <p>📉 <b>Support:</b> {a.support}</p>
                    <p>📈 <b>Resistance:</b> {a.resistance}</p>
                    <p>🛑 <b>Stop-loss:</b> {a.stop_loss}</p>
                    <p>🎯 <b>Target:</b> {a.target}</p>
                    <p className="text-green-600 font-medium">💡 {a.advice}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Raw Chatbot Data (fallback) */}
          {chatbotData && chatbotData.error && (
            <p className="text-red-400 mt-4">{chatbotData.error}</p>
          )}

          {/* Usage + Billing */}
          <div className="mt-6 p-4 bg-gray-950 border border-gray-700 rounded">
            <h2 className="text-lg font-semibold mb-2">📈 Usage Today</h2>
            <p>💡 Advices Generated: {usage.advices}</p>
            <p>📁 Portfolios Analyzed: {usage.portfolios}</p>
            <p className="mt-2 text-green-400 font-bold">
              Estimated Bill: ${usage.bill?.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
