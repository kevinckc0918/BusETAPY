import React, { useState, useEffect, useCallback } from 'react';
import { Bus, RefreshCw, MapPin, AlertCircle, Clock, Navigation, Moon, Sun, MonitorSmartphone } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [locationsData, setLocationsData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  const [showExactTime, setShowExactTime] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('kmb_theme');
      return saved !== null ? JSON.parse(saved) : true;
    } catch { return true; }
  });

  const [isStandMode, setIsStandMode] = useState(() => {
    try {
      const saved = localStorage.getItem('kmb_stand_mode');
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    try { localStorage.setItem('kmb_theme', JSON.stringify(isDarkMode)); } catch (e) {}
  }, [isDarkMode]);

  useEffect(() => {
    try { localStorage.setItem('kmb_stand_mode', JSON.stringify(isStandMode)); } catch (e) {}
  }, [isStandMode]);

  const theme = {
    appBg: isDarkMode ? 'bg-zinc-950 text-zinc-200' : 'bg-gray-100 text-gray-800',
    headerBg: isDarkMode ? 'bg-red-900 shadow-black/50' : 'bg-red-600 shadow-md',
    headerBtn: isDarkMode ? 'hover:bg-red-800 bg-red-800/50 text-white' : 'hover:bg-red-700 bg-red-700/60 text-white',
    headerBtnActive: isDarkMode ? 'bg-red-800 text-white shadow-inner ring-2 ring-white/20' : 'bg-red-800 text-white shadow-inner ring-2 ring-black/20',
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800 shadow-black/20' : 'bg-white border-gray-200 shadow-sm',
    cardHeader: isDarkMode ? 'bg-zinc-900 border-b border-zinc-800' : 'bg-gray-50 border-b border-gray-200',
    locName: isDarkMode ? 'text-zinc-100' : 'text-gray-800',
    locDesc: isDarkMode ? 'text-zinc-400 bg-zinc-800' : 'text-gray-500 bg-gray-200/60',
    routeWrapper: isDarkMode ? 'border-zinc-800/80 bg-zinc-800/30' : 'border-gray-100 bg-gray-50/60',
    routeDest: isDarkMode ? 'text-zinc-200' : 'text-gray-800',
    navIcon: isDarkMode ? 'text-zinc-500' : 'text-gray-400',
    badgeRed: isDarkMode ? 'bg-red-700 text-white shadow-red-900/50' : 'bg-red-600 text-white shadow-red-200',
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

        // 確保 68, 68F, 268M 齊全，如果沒有數據也補上空位，以維持三欄排版
        if (loc.name.includes("峻巒") && isStandMode) {
            const requiredRoutes = ['68', '68F', '268M'];
            requiredRoutes.forEach(r => {
                if (!routesList.find(item => item.route === r)) {
                    let defaultDest = "市區";
                    if(r === '68') defaultDest = "峻巒(總站)";
                    if(r === '68F') defaultDest = "峻巒(總站)";
                    if(r === '268M') defaultDest = "荃灣西站";
                    
                    routesList.push({
                        route: r,
                        dest: defaultDest,
                        etas: []
                    });
                }
            });
        }

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
  }, [isStandMode]);

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

  // 共用的 ETA 渲染組件
  const renderEtaBox = (eta, eIdx, isStandModeLayout = false) => {
    if (!eta) {
      return (
        <div key={`empty-${eIdx}`} className={`flex flex-col items-center justify-center rounded-xl border border-dashed transition-colors ${theme.emptyBox} ${isStandModeLayout ? 'h-full min-h-0' : 'aspect-[4/3] min-h-[60px]'}`}>
          <span className="text-xl font-bold opacity-30">-</span>
        </div>
      );
    }

    const diffMins = getEtaMinutes(eta.time);
    const etaText = getMinimalEta(diffMins);
    
    const isRed = diffMins >= 0 && diffMins <= 5;
    const isYellow = diffMins > 5 && diffMins <= 10;

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
    
    // 調整字體大小邏輯
    let sizeClass = '';
    if (isStandModeLayout) {
      if (showExactTime) {
         sizeClass = isText ? 'text-4xl md:text-5xl lg:text-5xl' : 'text-5xl md:text-6xl lg:text-7xl';
      } else {
         // 若為中文字 ("已開出", "即將")，縮小字體以防撐爆方格
         sizeClass = isText ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-[5rem] md:text-[6rem] lg:text-[8rem] xl:text-[9rem]';
      }
    } else {
      if (showExactTime) {
         sizeClass = isText ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl';
      } else {
         // 一般模式下同樣區分中英文
         sizeClass = isText ? 'text-2xl md:text-3xl' : 'text-4xl md:text-5xl lg:text-6xl';
      }
    }

    return (
      <div 
        key={eIdx}
        className={`relative flex flex-col items-center justify-center rounded-xl border overflow-hidden transition-colors ${boxStyle} ${isStandModeLayout ? 'h-full min-h-0' : 'aspect-[4/3] min-h-[60px]'}`}
      >
        <span className={`
          ${sizeClass} 
          font-black tracking-tighter leading-none text-center px-2
          flex items-center justify-center w-full h-full
        `}>
          {etaText}
        </span>
        
        {showExactTime && (
          <span className={`absolute bottom-2 md:bottom-3 text-sm md:text-base font-bold px-3 py-1 rounded-full backdrop-blur-md transition-colors ${theme.timeOverlay}`}>
            {formatTime(eta.time)}
          </span>
        )}

        {eta.rmk && (
          <div className={`absolute top-0 right-0 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-bl-xl border-b border-l truncate max-w-[90%] z-10 transition-colors ${rmkStyle}`}>
            {eta.rmk}
          </div>
        )}
      </div>
    );
  };

  // 座枱模式主畫面渲染 (橫向 3 欄，垂直排版班次)
  const renderStandMode = () => {
    // 只抽取峻巒總站的數據
    const parkYohoData = locationsData.find(loc => loc.id === "67D38E584B919815");

    if (!parkYohoData || parkYohoData.routesData.length === 0) {
      return (
        <div className={`flex-1 flex flex-col items-center justify-center rounded-2xl transition-colors ${theme.noDataBox} m-4 md:m-6`}>
          <Bus className={`w-16 h-16 mb-4 transition-colors ${theme.noDataIcon}`} />
          <p className={`font-bold text-2xl transition-colors ${theme.noDataText}`}>目前無峻巒起行之班次</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-4 md:gap-6 w-full h-full p-4 md:p-6 pb-20">
        {parkYohoData.routesData.slice(0, 3).map((route, rIdx) => {
          const displayEtas = [route.etas[0] || null, route.etas[1] || null];

          return (
            <div key={rIdx} className={`rounded-3xl p-4 md:p-6 flex flex-col gap-4 md:gap-6 border-2 transition-colors h-full shadow-lg ${theme.card}`}>
              
              {/* 巨大化標題列 */}
              <div className={`flex flex-col items-center justify-center gap-2 md:gap-4 w-full pb-4 border-b-2 shrink-0 ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
                <span className={`font-black px-6 py-2 rounded-2xl text-4xl md:text-5xl xl:text-6xl leading-none shadow-lg transition-colors ${theme.badgeRed}`}>
                  {route.route}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <Navigation className={`w-5 h-5 md:w-6 md:h-6 shrink-0 transition-colors ${theme.navIcon}`} />
                  <span className={`font-black text-2xl md:text-3xl xl:text-4xl truncate tracking-tight text-center transition-colors ${theme.routeDest}`}>
                    往 {route.dest}
                  </span>
                </div>
              </div>

              {/* 上下排列時間格 (填滿剩餘高度) */}
              <div className="grid grid-rows-2 gap-4 md:gap-6 flex-1 min-h-0">
                {displayEtas.map((eta, eIdx) => renderEtaBox(eta, eIdx, true))}
              </div>

            </div>
          );
        })}
      </div>
    );
  };

  // 一般模式主畫面渲染
  const renderNormalMode = () => (
    <div className="w-full max-w-4xl mx-auto px-2 py-4 md:py-6 flex flex-col gap-4">
      {activeLocations.map((loc, locIdx) => (
        <div key={locIdx} className={`rounded-2xl overflow-hidden transition-colors duration-300 ${theme.card}`}>
          <div className={`px-4 py-3 flex items-center justify-between transition-colors ${theme.cardHeader}`}>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              <h2 className={`font-bold text-lg transition-colors ${theme.locName}`}>{loc.name}</h2>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-md font-bold transition-colors ${theme.locDesc}`}>
              {loc.desc}
            </span>
          </div>

          <div className="grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-3 p-3">
            {loc.routesData.map((route, rIdx) => {
              const displayEtas = [route.etas[0] || null, route.etas[1] || null];

              return (
                <div key={rIdx} className={`rounded-xl p-2.5 flex flex-col gap-2.5 relative overflow-hidden transition-colors border ${theme.routeWrapper}`}>
                  <div className="flex items-center gap-2 w-full">
                    <span className={`font-black px-2.5 py-1 rounded-md text-base leading-none shrink-0 shadow-sm transition-colors ${theme.badgeRed}`}>
                      {route.route}
                    </span>
                    <Navigation className={`w-4 h-4 shrink-0 transition-colors ${theme.navIcon}`} />
                    <span className={`font-bold text-base truncate tracking-wide transition-colors ${theme.routeDest}`}>
                      {route.dest}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    {displayEtas.map((eta, eIdx) => renderEtaBox(eta, eIdx, false))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className={`text-center text-xs md:text-sm pt-4 pb-6 font-bold transition-colors ${theme.footerText}`}>
        數據由資料一線通提供 • 每 30 秒自動更新
      </div>
    </div>
  );

  return (
    <div className={`h-screen font-sans flex flex-col overflow-hidden transition-colors duration-300 ${theme.appBg}`}>
      {/* 頂部 Header */}
      <header className={`p-3 shrink-0 transition-colors duration-300 z-20 ${theme.headerBg}`}>
        <div className={`${isStandMode ? 'max-w-full px-4' : 'max-w-4xl mx-auto px-1'} w-full flex justify-between items-center transition-all duration-300`}>
          <div className="flex items-center gap-2.5">
            <Bus className="w-6 h-6 text-white" />
            <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
              峻巒交通全覽
            </h1>
            {isStandMode && (
              <span className="hidden md:flex items-center gap-1.5 bg-red-950/40 text-red-100 text-xs px-2.5 py-1 rounded-full font-bold ml-2 border border-red-800/50">
                <MonitorSmartphone className="w-3.5 h-3.5" /> 座枱模式
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm text-white/90 hidden md:inline-block font-bold">
              更新: {lastUpdated ? formatTime(lastUpdated) : '--:--'}
            </span>
            
            {/* 座枱模式 Toggle */}
            <button 
              onClick={() => setIsStandMode(!isStandMode)}
              className={`p-2 rounded-full transition-all ${isStandMode ? theme.headerBtnActive : theme.headerBtn}`}
              title="切換座枱模式 (橫向大字體)"
            >
              <MonitorSmartphone className="w-5 h-5" />
            </button>

            {/* 顯示時間 Toggle */}
            <button 
              onClick={() => setShowExactTime(!showExactTime)}
              className={`p-2 rounded-full transition-all ${showExactTime ? theme.headerBtnActive : theme.headerBtn}`}
              title="切換顯示確實時間"
            >
              <Clock className="w-5 h-5" />
            </button>

            {/* 暗黑模式 Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-all ${theme.headerBtn}`}
              title="切換主題模式"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* 更新按鈕 */}
            <button 
              onClick={fetchData} 
              disabled={loading}
              className={`p-2 rounded-full transition-all ${theme.headerBtn}`}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 主內容區 - 使用 flex-1 及 overflow-y-auto 處理滾動 */}
      <main className={`flex-1 w-full overflow-y-auto ${isStandMode ? 'overflow-hidden' : ''}`}>
        
        {/* 錯誤提示 */}
        {error && !isStandMode && (
          <div className={`max-w-4xl mx-auto px-2 mt-4`}>
             <div className={`p-3 md:p-4 rounded-xl flex items-start gap-2.5 text-sm md:text-base font-bold transition-colors ${theme.errorBox}`}>
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
             </div>
          </div>
        )}

        {/* 根據模式切換渲染內容 */}
        {!loading && (
          isStandMode ? renderStandMode() : renderNormalMode()
        )}
        
      </main>
      
      {/* 獨立的更新狀態欄 (僅限座枱模式底部) */}
      {isStandMode && (
        <div className={`absolute bottom-0 left-0 w-full text-center text-xs md:text-sm py-3 font-bold transition-colors z-10 ${isDarkMode ? 'bg-zinc-950/80 text-zinc-500' : 'bg-gray-100/80 text-gray-400'}`}>
           數據由資料一線通提供 • 每 30 秒自動更新
           {error && <span className="ml-2 text-red-500">({error})</span>}
        </div>
      )}
    </div>
  );
}