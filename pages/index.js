import { useState } from "react";

export default function Home() {
  const [purpose, setPurpose] = useState("a new MacDonalds");

  const [preferences, setPreferences] = useState(
    "size 2 acres plus, corner lot, no MacDonalds within 2 KM, traffic is good"
  );

  const [bestFits, setBestFits] = useState([]);
  const [tokenUsage, setTokenUsage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const findLands = async () => {
    setLoading(true);
    setError("");

    setBestFits([]);
    setTokenUsage(null);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purpose,
          preferences,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Search failed");
      }

      setBestFits(data.bestFits || []);
      setTokenUsage(data.tokenUsage || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            AI Land Search
          </h1>

          <p className="text-slate-600 mt-2">
            Find the best land opportunities based on your purpose and
            preferences.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <label className="block mb-5">
            <span className="block text-sm font-semibold text-slate-700 mb-2">
              Purpose
            </span>

            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-4"
            />
          </label>

          <label className="block mb-6">
            <span className="block text-sm font-semibold text-slate-700 mb-2">
              Preferences
            </span>

            <textarea
              rows={5}
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-4"
            />
          </label>

          <button
            onClick={findLands}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-8 py-4 rounded-xl font-bold"
          >
            {loading ? "Searching..." : "Find Lands"}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              {error}
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow p-8 text-center mb-6">
            <div className="text-xl font-bold">
              Searching listings...
            </div>
          </div>
        )}

        {!loading && bestFits.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Best preliminary fits from LoopNet
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="p-3 border">Rank</th>
                    <th className="p-3 border">Property</th>
                    <th className="p-3 border">Size</th>
                    <th className="p-3 border">
                      Why it may fit
                    </th>
                  </tr>
                </thead>
                <tbody>
  {bestFits.map((item, index) => (
    <tr key={index}>
      <td className="p-3 border font-bold">
        {item.rank || index + 1}
      </td>

      <td className="p-3 border font-semibold">
        <div>{item.property}</div>

        <div className="mt-2">
          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
            Score: {item.score || 0}/100
          </span>
        </div>
      </td>

      <td className="p-3 border">
        {item.size}
      </td>

      <td className="p-3 border text-slate-700">
        {item.whyItMayFit}
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && tokenUsage && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Token Usage
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-100 rounded-xl p-4">
                <div className="text-sm text-slate-500">
                  Input
                </div>

                <div className="text-2xl font-bold">
                  {tokenUsage.inputTokens}
                </div>
              </div>

              <div className="bg-slate-100 rounded-xl p-4">
                <div className="text-sm text-slate-500">
                  Output
                </div>

                <div className="text-2xl font-bold">
                  {tokenUsage.outputTokens}
                </div>
              </div>

              <div className="bg-slate-100 rounded-xl p-4">
                <div className="text-sm text-slate-500">
                  Total
                </div>

                <div className="text-2xl font-bold">
                  {tokenUsage.totalTokens}
                </div>
              </div>

              <div className="bg-green-100 rounded-xl p-4">
                <div className="text-sm text-green-700">
                  Approx Cost
                </div>

                <div className="text-2xl font-bold text-green-800">
                  ${tokenUsage.approxCostUSD}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}