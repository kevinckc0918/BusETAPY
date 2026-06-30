import React, { useState, useEffect, useCallback } from 'react';
import { Bus, RefreshCw, MapPin, AlertCircle, Clock, Navigation, Moon, Sun } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [locationsData, setLocationsData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [showExactTime, setShowExactTime] = useState(false);
  const [now, setNow] = useState(new Date());
  
  // 預設為暗黑主題，並嘗試從 localStorage 讀取已儲存的設定
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('kmb_theme');
      if (savedTheme !== null) {
        return JSON.parse(savedTheme);
      }
    } catch (e) {
      console.warn("無法讀取主題設定", e);
    }
    return true; // 如果沒有記錄，預設為黑色主題
  });

  // 當主題改變時，自動儲存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kmb_theme', JSON.stringify(isDarkMode));
    } catch (e) {
      console.warn("無法儲存主題設定", e);
    }
  }, [isDarkMode]);

  // 主題配色字典 (Theme Dictionary)
  const theme = {
    appBg: isDarkMode ? 'bg-zinc-950 text-zinc-200' : 'bg-gray-100 text-gray-800',
    headerBg: isDarkMode ? 'bg-red-900 shadow-black/50' : 'bg-red-600 shadow-md',
    headerBtn: isDarkMode ? 'hover:bg-red-800 bg-red-800/50 text-white' : 'hover:bg-red-700 bg-red-700/60 text-white',
    headerBtnActive: isDarkMode ? 'bg-red-800 text-white shadow-inner' : 'bg-red-800 text-white shadow-inner',
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800 shadow-black/20' : 'bg-white border-gray-200 shadow-sm',
    cardHeader: isDarkMode ? 'bg-zinc-900 border-b border-zinc-800' : 'bg-gray-50 border-b border-gray-200',
    locName: isDarkMode ? 'text-zinc-100' : 'text-gray-800',
    locDesc: isDarkMode ? 'text-zinc-400 bg-zinc-800' : 'text-gray-500 bg-gray-200/60',
    routeWrapper: isDarkMode ? 'border-zinc-800/80 bg-zinc-800/30' : 'border-gray-100 bg-gray-50/60',
    routeDest: isDarkMode ? 'text-zinc-200' : 'text-gray-800',
    navIcon: isDarkMode ? 'text-zinc-500' : 'text-gray-400',
    badgeRed: isDarkMode ? 'bg-red-700 text-white' : 'bg-red-600 text-white',
    emptyBox: isDarkMode ? 'border-zinc-800 bg-zinc-800/20 text-zinc-700' : 'border-gray-200 bg-gray-50/50 text-gray-300',
    timeOverlay: isDarkMode ? 'bg-zinc-900/90 text-zinc-300 shadow-black/50' : 'bg-white/80 text-gray-700 shadow-sm',
    footerText: isDarkMode ? 'text-zinc-500' : 'text-gray-400',
    errorBox: isDarkMode ? 'bg-red-950/40 border-red-900/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700',
    noDataBox: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200',
    noDataIcon: isDarkMode ? 'text-zinc-700' : 'text-gray-300',
    noDataText: isDarkMode ? 'text-zinc-400' : 'text-gray-500'
  };

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

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      setError('獲取數據失敗，請檢查網絡連線。');
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
    <div className={`min-h-screen font-sans pb-4 transition-colors duration-300 ${theme.appBg}`}>
      {/* 頂部 Header */}
      <header className={`p-3 sticky top-0 z-10 transition-colors duration-300 ${theme.headerBg}`}>
        <div className="max-w-4xl mx-auto w-full flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-white" />
            <h1 className="text-lg md:text-xl font-black tracking-wide text-white">峻巒巴士到站</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-white/90 hidden sm:inline-block font-medium">
              更新: {lastUpdated ? formatTime(lastUpdated) : '--:--'}
            </span>
            
            {/* 顯示時間 Toggle */}
            <button 
              onClick={() => setShowExactTime(!showExactTime)}
              className={`p-1.5 rounded-full transition-all ${showExactTime ? theme.headerBtnActive : theme.headerBtn}`}
              title="切換顯示確實時間"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* 暗黑模式 Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 rounded-full transition-all ${theme.headerBtn}`}
              title="切換主題模式"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* 更新按鈕 */}
            <button 
              onClick={fetchData} 
              disabled={loading}
              className={`p-1.5 rounded-full transition-all ${theme.headerBtn}`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto px-2 py-4 space-y-4 md:space-y-5">
        
        {/* 錯誤提示 */}
        {error && (
          <div className={`p-3 rounded-lg flex items-start gap-2 text-sm transition-colors ${theme.errorBox}`}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* 無數據顯示 */}
        {!loading && activeLocations.length === 0 && (
          <div className={`p-10 rounded-xl text-center flex flex-col items-center transition-colors ${theme.noDataBox}`}>
             <Bus className={`w-12 h-12 mb-3 transition-colors ${theme.noDataIcon}`} />
             <p className={`font-medium text-lg transition-colors ${theme.noDataText}`}>目前均無即將到站班次</p>
          </div>
        )}

        {/* 路線資料顯示 */}
        <div className="flex flex-col gap-4">
          {activeLocations.map((loc, locIdx) => (
            <div key={locIdx} className={`rounded-xl overflow-hidden transition-colors duration-300 ${theme.card}`}>
              
              <div className={`px-3 py-2.5 flex items-center justify-between transition-colors ${theme.cardHeader}`}>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <h2 className={`font-bold text-base transition-colors ${theme.locName}`}>{loc.name}</h2>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${theme.locDesc}`}>
                  {loc.desc}
                </span>
              </div>

              {/* 網格排版：直向 2 列，橫向 4 列 */}
              <div className="grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-2 p-2">
                {loc.routesData.map((route, rIdx) => {
                  
                  const displayEtas = [route.etas[0] || null, route.etas[1] || null];

                  return (
                    <div key={rIdx} className={`rounded-lg p-2 flex flex-col gap-2 relative overflow-hidden transition-colors border ${theme.routeWrapper}`}>
                      
                      {/* 路線與方向 */}
                      <div className="flex items-center gap-1.5 w-full">
                        <span className={`font-black px-2 py-0.5 rounded text-sm md:text-base leading-none shrink-0 shadow-sm transition-colors ${theme.badgeRed}`}>
                          {route.route}
                        </span>
                        <Navigation className={`w-3.5 h-3.5 shrink-0 transition-colors ${theme.navIcon}`} />
                        <span className={`font-bold text-sm md:text-base truncate tracking-wide transition-colors ${theme.routeDest}`}>
                          {route.dest}
                        </span>
                      </div>

                      {/* 時間方格 */}
                      <div className="grid grid-cols-2 gap-1.5 w-full">
                        {displayEtas.map((eta, eIdx) => {
                          
                          if (!eta) {
                            return (
                              <div key={`empty-${eIdx}`} className={`flex flex-col items-center justify-center rounded-lg border border-dashed aspect-[4/3] min-h-[60px] transition-colors ${theme.emptyBox}`}>
                                <span className="text-xs font-bold">-</span>
                              </div>
                            );
                          }

                          const diffMins = getEtaMinutes(eta.time);
                          const etaText = getMinimalEta(diffMins);
                          
                          const isRed = diffMins >= 0 && diffMins <= 5;
                          const isYellow = diffMins > 5 && diffMins <= 10;

                          // 根據當前主題和時間狀態動態選擇樣式
                          let boxStyle = isDarkMode ? 'bg-zinc-800/60 border-zinc-700 text-zinc-300' : 'bg-gray-50 border-gray-200 text-gray-600';
                          if (isRed) {
                            boxStyle = isDarkMode ? 'bg-red-950/40 border-red-900/60 text-red-400' : 'bg-red-50 border-red-200 text-red-700 shadow-sm';
                          } else if (isYellow) {
                            boxStyle = isDarkMode ? 'bg-amber-950/40 border-amber-900/60 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm';
                          }

                          let rmkStyle = isDarkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-gray-100 text-gray-500 border-gray-200';
                          if (isRed) {
                            rmkStyle = isDarkMode ? 'bg-red-950 text-red-400 border-red-900' : 'bg-red-100 text-red-600 border-red-200';
                          } else if (isYellow) {
                            rmkStyle = isDarkMode ? 'bg-amber-950 text-amber-400 border-amber-900' : 'bg-amber-100 text-amber-800 border-amber-300';
                          }

                          const isText = isNaN(etaText);
                          
                          // 終極大字體，純數字時撐滿
                          const sizeClass = showExactTime
                            ? (isText ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl')
                            : (isText ? 'text-3xl md:text-4xl' : 'text-5xl md:text-6xl lg:text-7xl');

                          return (
                            <div 
                              key={eIdx}
                              className={`relative flex flex-col items-center justify-center rounded-lg border overflow-hidden aspect-[4/3] min-h-[60px] transition-colors ${boxStyle}`}
                            >
                              <span className={`
                                ${sizeClass} 
                                font-black tracking-tighter leading-none
                                flex items-center justify-center w-full h-full
                              `}>
                                {etaText}
                              </span>
                              
                              {showExactTime && (
                                <span className={`absolute bottom-1.5 text-xs font-bold px-1.5 py-0.5 rounded backdrop-blur-sm transition-colors ${theme.timeOverlay}`}>
                                  {formatTime(eta.time)}
                                </span>
                              )}

                              {eta.rmk && (
                                <div className={`absolute top-0 right-0 text-[9px] font-bold px-1.5 py-[3px] rounded-bl-lg border-b border-l truncate max-w-[90%] z-10 transition-colors ${rmkStyle}`}>
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
        
        <div className={`text-center text-xs pt-2 pb-6 font-medium transition-colors ${theme.footerText}`}>
          數據由資料一線通提供 • 每 30 秒自動更新
        </div>
      </main>
    </div>
  );
}
