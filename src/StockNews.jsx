// src/StockNews.jsx
import React, { useEffect, useState } from "react";

const StockNews = ({ symbol }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;

    const fetchNews = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://127.0.0.1:8000/news/${symbol}`);
        const data = await res.json();
        setNews(data.news || []);
      } catch (err) {
        console.error("Error fetching news:", err);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [symbol]);

  if (loading) return <p>Loading news...</p>;

  if (!news.length) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-white shadow-md">
        <h2 className="text-lg font-bold mb-3">📰 Latest News for {symbol}</h2>
        <p className="text-gray-500">No recent news found.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-white shadow-md">
      <h2 className="text-lg font-bold mb-3">
        📰 Latest News for {symbol.toUpperCase()}
      </h2>
      <ul className="space-y-3">
        {news.map((item, idx) => (
          <li
            key={idx}
            className="p-3 border rounded-lg hover:bg-gray-50 transition"
          >
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold hover:underline"
            >
              {item.title}
            </a>
            <p className="text-sm text-gray-700 mt-1">{item.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              {item.source} • {new Date(item.published).toLocaleString()}
            </p>
            <p
              className={`mt-2 text-sm font-bold ${
                item.sentiment === "Positive"
                  ? "text-green-600"
                  : item.sentiment === "Negative"
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              Sentiment: {item.sentiment} ({item.confidence}%)
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StockNews;
