import React, { useState, useEffect, useCallback } from 'react';
import { Bus, RefreshCw, MapPin, AlertCircle, Clock } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [locationsData, setLocationsData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [showExactTime, setShowExactTime] = useState(false);

  const LOCATIONS = [
    {
      id: "67D38E584B919815",
      name: "峻巒 (總站)",
      desc: "往市區方向",
      routes: ['68', '68F', '268M'],
      filterSeq: (eta) => eta.seq <= 5 && !eta.dest_tc.includes('峻巒')
    },
    {
      id: "0C943B7308FF4DCC",
      name: "形點 II",
      desc: "往峻巒方向",
      routes: ['68', '68F'],
      filterSeq: (eta) => eta.seq > 5
    },
    {
      id: "7917E395940F86AF",
      name: "形點 I",
      desc: "往峻巒方向",
      routes: ['68', '68F'],
      filterSeq: (eta) => eta.seq > 5
    },
    {
      id: "E481F7170B1F6FC3",
      name: "大欖隧道 (B1)",
      desc: "往峻巒方向",
      routes: ['268M'],
      filterSeq: (eta) => true
    }
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stopPromises = LOCATIONS.map(loc => 
        fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${loc.id}`)
          .then(res => res.ok ? res.json() : { data: [] })
          .catch(() => ({ data: [] }))
      );

      const route268MPromise = fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-eta/268M/1`)
          .then(res => res.ok ? res.json() : { data: [] })
          .catch(() => ({ data: [] }));

      const results = await Promise.all([...stopPromises, route268MPromise]);
      
      const stopResults = results.slice(0, LOCATIONS.length);
      const result268M = results[LOCATIONS.length];

      const all268MEtas = result268M.data || [];
      const parkYoho268MEtas = all268MEtas.filter(eta => eta.seq === 1);

      const processedData = LOCATIONS.map((loc, idx) => {
        let allEtas = stopResults[idx].data || [];
        
        if (loc.name.includes("峻巒")) {
            allEtas = [...allEtas, ...parkYoho268MEtas];
        }

        const routesList = [];

        loc.routes.forEach(routeNum => {
          const validEtas = allEtas.filter(eta => 
            eta.route === routeNum && eta.eta && loc.filterSeq(eta)
          );

          if (validEtas.length > 0) {
            const dests = [...new Set(validEtas.map(e => e.dest_tc))];
            
            dests.forEach(dest => {
              const destEtas = validEtas.filter(e => e.dest_tc === dest);
              destEtas.sort((a, b) => new Date(a.eta) - new Date(b.eta));

              let displayDest = dest;
              if (loc.name.includes('形點') || loc.name.includes('大欖隧道')) {
                displayDest = '峻巒(總站)'; 
              } else if (displayDest.includes('荃灣西')) {
                displayDest = '荃灣西站'; 
              } else if (displayDest.includes('愉景新城')) {
                displayDest = '荃灣';
              }

              routesList.push({
                route: routeNum,
                dest: displayDest,
                etas: destEtas.slice(0, 2).map(e => ({
                  time: new Date(e.eta),
                  rmk: e.rmk_tc !== "原定班次" ? e.rmk_tc : null
                }))
              });
            });
          }
        });

        routesList.sort((a, b) => a.route.localeCompare(b.route, undefined, { numeric: true }));

        return {
          ...loc,
          routesData: routesList
        };
      });

      setLocationsData(processedData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('獲取數據失敗，請檢查網絡。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getEtaMinutes = (etaDate) => {
    const now = new Date();
    const diffMs = etaDate - now;
    return Math.floor(diffMs / 60000);
  };

  const getMinimalEta = (diffMins) => {
    if (diffMins < 0) return '已開出';
    if (diffMins === 0) return '即將'; 
    return `${diffMins}`; 
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const activeLocations = locationsData.filter(loc => loc.routesData.length > 0);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-4">
      <header className="bg-red-600 text-white p-2 md:p-3 shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <Bus className="w-5 h-5 text-white" />
            <h1 className="text-base md:text-lg font-bold tracking-wide text-white">峻巒巴士到站</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs text-white/90">
              更新: {lastUpdated ? formatTime(lastUpdated) : '--:--'}
            </span>
            <button 
              onClick={() => setShowExactTime(!showExactTime)}
              className={`p-1.5 rounded-full transition-colors ${showExactTime ? 'bg-red-800 text-white' : 'hover:bg-red-700 bg-red-700/60 text-white'}`}
              title="切換顯示確實時間"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="p-1.5 rounded-full hover:bg-red-700 transition-colors bg-red-700/60 text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-1.5 py-3 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 p-2 rounded-md shadow-sm flex items-start gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && activeLocations.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center flex flex-col items-center">
             <Bus className="w-10 h-10 text-gray-300 mb-2" />
             <p className="text-gray-500 font-medium text-sm">目前均無即將到站班次</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {activeLocations.map((loc, locIdx) => (
            <div key={locIdx} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              
              <div className="bg-gray-100 border-b border-gray-200 px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <h2 className="font-bold text-gray-800 text-sm md:text-base">{loc.name}</h2>
                </div>
                <span className="text-[10px] md:text-xs text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded">{loc.desc}</span>
              </div>

              <div className="grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-2 p-2">
                {loc.routesData.map((route, rIdx) => {
                  
                  const displayEtas = [route.etas[0] || null, route.etas[1] || null];

                  return (
                    <div key={rIdx} className="border border-gray-100 rounded-lg bg-gray-50/60 p-2 flex flex-col gap-2 relative overflow-hidden">
                      
                      {/* 【字體放大核心】路線號碼與目的地 */}
                      <div className="flex items-center gap-2 w-full">
                        <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded text-sm md:text-base leading-tight shrink-0 shadow-sm">
                          {route.route}
                        </span>
                        <span className="font-bold text-gray-800 text-sm md:text-base truncate tracking-wide">
                          往 {route.dest}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 w-full">
                        {displayEtas.map((eta, eIdx) => {
                          
                          if (!eta) {
                            return (
                              <div key={`empty-${eIdx}`} className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white/50 aspect-[4/3]">
                                <span className="text-gray-300 text-xs">-</span>
                              </div>
                            );
                          }

                          const diffMins = getEtaMinutes(eta.time);
                          const etaText = getMinimalEta(diffMins);
                          
                          const isRed = diffMins >= 0 && diffMins <= 5;
                          const isYellow = diffMins > 5 && diffMins <= 10;

                          let boxStyle = 'bg-white border-gray-200 text-gray-600';
                          if (isRed) {
                            boxStyle = 'bg-red-50 border-red-200 text-red-700 shadow-sm';
                          } else if (isYellow) {
                            boxStyle = 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm';
                          }

                          let textStyle = '';
                          if (isRed) {
                            textStyle = 'text-red-600';
                          } else if (isYellow) {
                            textStyle = 'text-amber-600';
                          }

                          const isText = isNaN(etaText);
                          
                          const sizeClass = showExactTime
                            ? (isText ? 'text-xl md:text-2xl' : 'text-4xl md:text-5xl')
                            : (isText ? 'text-3xl md:text-4xl' : 'text-6xl md:text-7xl lg:text-[5rem]');

                          return (
                            <div 
                              key={eIdx}
                              className={`relative flex flex-col items-center justify-center rounded-lg border ${boxStyle} overflow-hidden aspect-[4/3]`}
                            >
                              <span className={`
                                ${sizeClass} 
                                font-black tracking-tighter leading-none ${textStyle}
                                flex items-center justify-center w-full h-full
                              `}>
                                {etaText}
                              </span>
                              
                              {showExactTime && (
                                <span className="absolute bottom-1.5 text-xs opacity-75 leading-none font-medium bg-white/80 px-1.5 py-0.5 rounded shadow-sm">
                                  {formatTime(eta.time)}
                                </span>
                              )}

                              {eta.rmk && (
                                <div className={`absolute top-0 right-0 text-[8px] md:text-[9px] font-bold px-1.5 py-[3px] rounded-bl-lg border-b border-l shadow-sm truncate max-w-[90%] z-10
                                  ${isRed ? 'bg-red-100 text-red-600 border-red-200' : 
                                    isYellow ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                    'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                  {eta.rmk}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center text-xs text-gray-400 pt-2 pb-4">
          數據由資料一線通提供 • 每 30 秒自動更新
        </div>
      </main>
    </div>
  );
}
