import React, { useState, useEffect, useCallback } from 'react';
import { Bus, RefreshCw, MapPin, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [stopsMap, setStopsMap] = useState(null); 
  const [locationsData, setLocationsData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [showExactTime, setShowExactTime] = useState(false);

  const VISUAL_CARDS = [
    {
      name: "峻巒 (總站)",
      desc: "往市區方向",
      fetches: [
        { type: 'stop', id: '67D38E584B919815', routes: ['68', '68F'], filter: (eta) => eta.seq <= 5 },
        { type: 'route', route: '268M', routes: ['268M'], filter: (eta) => eta.seq === 1 }
      ]
    },
    {
      name: "形點 II",
      desc: "往峻巒方向",
      fetches: [
        { type: 'stop', id: '0C943B7308FF4DCC', routes: ['68', '68F'], filter: (eta) => eta.seq > 5 }
      ]
    },
    {
      name: "形點 I",
      desc: "往峻巒方向",
      fetches: [
        { type: 'stop', id: '7917E395940F86AF', routes: ['68', '68F'], filter: (eta) => eta.seq > 5 }
      ]
    },
    {
      name: "大欖隧道 (B1)",
      desc: "往峻巒方向",
      fetches: [
        { 
          type: 'route', 
          route: '268M', 
          routes: ['268M'], 
          filter: (eta, map) => {
            const stopName = map[eta.stop] || '';
            return stopName.includes('大欖隧道') && eta.dest_tc.includes('峻巒');
          }
        }
      ]
    }
  ];

  useEffect(() => {
    fetch('https://data.etabus.gov.hk/v1/transport/kmb/stop')
      .then(r => r.json())
      .then(json => {
        const map = {};
        json.data.forEach(s => map[s.stop] = s.name_tc);
        setStopsMap(map);
      })
      .catch(err => {
        console.error("無法載入車站名單", err);
        setError("系統初始化失敗，請重新整理頁面。");
      });
  }, []);

  const fetchData = useCallback(async () => {
    if (!stopsMap) return;
    setError(null);
    setLoading(true);

    try {
      const endpoints = new Set();
      VISUAL_CARDS.forEach(card => {
        card.fetches.forEach(f => {
          if (f.type === 'stop') endpoints.add(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${f.id}`);
          if (f.type === 'route') endpoints.add(`https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${f.route}/1`);
        });
      });

      const results = await Promise.all(
        Array.from(endpoints).map(url => fetch(url).then(r => r.ok ? r.json() : { data: [] }))
      );

      const dataMap = {};
      Array.from(endpoints).forEach((url, i) => {
        dataMap[url] = results[i].data || [];
      });

      const processedCards = VISUAL_CARDS.map(card => {
        let allEtasForCard = [];
        
        card.fetches.forEach(f => {
          const url = f.type === 'stop' 
            ? `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${f.id}`
            : `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${f.route}/1`;
          
          const rawEtas = dataMap[url] || [];
          const validEtas = rawEtas.filter(eta => 
            f.routes.includes(eta.route) && eta.eta && f.filter(eta, stopsMap)
          );
          allEtasForCard = [...allEtasForCard, ...validEtas];
        });

        const routesList = [];
        const uniqueRoutes = [...new Set(allEtasForCard.map(e => e.route))];

        uniqueRoutes.forEach(routeNum => {
          const routeEtas = allEtasForCard.filter(e => e.route === routeNum);
          const dests = [...new Set(routeEtas.map(e => e.dest_tc))];
          
          dests.forEach(dest => {
            const destEtas = routeEtas.filter(e => e.dest_tc === dest);
            destEtas.sort((a, b) => new Date(a.eta) - new Date(b.eta));

            let displayDest = dest;
            if (card.name.includes('形點') || card.name.includes('大欖隧道')) {
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
        });

        routesList.sort((a, b) => a.route.localeCompare(b.route, undefined, { numeric: true }));

        return { ...card, routesData: routesList };
      });

      setLocationsData(processedCards);
      setLastUpdated(new Date());

    } catch (err) {
      console.error(err);
      setError('獲取數據失敗，請檢查網絡連線。');
    } finally {
      setLoading(false);
    }
  }, [stopsMap]);

  useEffect(() => {
    if (stopsMap) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchData, stopsMap]);

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
            <Bus className="w-5 h-5" />
            <h1 className="text-base md:text-lg font-bold tracking-wide">峻巒巴士到站</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs text-red-200">
              更新: {lastUpdated ? formatTime(lastUpdated) : '--:--'}
            </span>
            <button 
              onClick={() => setShowExactTime(!showExactTime)}
              className="p-1.5 rounded-full hover:bg-red-700 transition-colors bg-red-700/50"
              title="切換顯示確實時間"
            >
              {showExactTime ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button 
              onClick={fetchData} 
              disabled={loading || !stopsMap}
              className="p-1.5 rounded-full hover:bg-red-700 transition-colors bg-red-700/50"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || !stopsMap) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-1.5 py-3 space-y-3">
        {!stopsMap && !error && (
          <div className="text-center py-10 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 text-red-500 animate-spin mb-3" />
            <p className="text-sm text-gray-500 font-medium">正在載入全港車站名單...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-2 rounded-md shadow-sm flex items-start gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && stopsMap && !error && activeLocations.length === 0 && (
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
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <h2 className="font-bold text-gray-800 text-sm">{loc.name}</h2>
                </div>
                <span className="text-[10px] text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded">{loc.desc}</span>
              </div>

              <div className="grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-1.5 p-1.5">
                {loc.routesData.map((route, rIdx) => {
                  
                  const displayEtas = [route.etas[0] || null, route.etas[1] || null];

                  return (
                    <div key={rIdx} className="border border-gray-100 rounded-md bg-gray-50/50 p-1.5 flex flex-col gap-1.5 relative overflow-hidden">
                      
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-xs md:text-sm leading-none shrink-0 shadow-sm">
                          {route.route}
                        </span>
                        <span className="font-bold text-gray-700 text-xs md:text-sm truncate">
                          往 {route.dest}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 w-full h-[52px]">
                        {displayEtas.map((eta, eIdx) => {
                          
                          if (!eta) {
                            return (
                              <div key={`empty-${eIdx}`} className="flex flex-col items-center justify-center rounded border border-dashed border-gray-200 bg-white/50 h-full">
                                <span className="text-gray-300 text-[10px]">-</span>
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

                          // 針對 "即將" 或 "已開出" 這種中文字，稍微調小一點，避免爆框
                          const isText = isNaN(etaText);
                          
                          return (
                            <div 
                              key={eIdx}
                              className={`relative flex flex-col items-center justify-center rounded border h-full ${boxStyle} overflow-hidden`}
                            >
                              {/* 動態調整字體大小，盡量填滿 */}
                              <span className={`
                                ${showExactTime 
                                  ? (isText ? 'text-lg' : 'text-xl') 
                                  : (isText ? 'text-2xl' : 'text-3xl md:text-4xl')} 
                                font-black tracking-tighter leading-none ${textStyle}
                                flex items-center justify-center
                              `} style={{ height: showExactTime ? 'auto' : '100%' }}>
                                {etaText}
                              </span>
                              
                              {showExactTime && (
                                <span className="text-[10px] opacity-60 leading-none mt-1">
                                  {formatTime(eta.time)}
                                </span>
                              )}

                              {eta.rmk && (
                                <div className={`absolute -top-1.5 -right-1 text-[7px] font-bold px-1 py-0.5 rounded border shadow-sm truncate max-w-[90%] z-10
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
        
        <div className="text-center text-[10px] text-gray-400 pt-2 pb-4">
          數據由資料一線通提供 • 每 30 秒自動更新
        </div>
      </main>
    </div>
  );
}
