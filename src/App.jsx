import React, { useState, useEffect, useCallback } from 'react';
import { Bus, RefreshCw, Moon, Sun, MonitorSmartphone, Navigation } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [locationsData, setLocationsData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  // 底部導航過濾器
  const [activeTab, setActiveTab] = useState('ALL');
  
  // 設定狀態與自動記憶
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('kmb_theme');
      return saved !== null ? JSON.parse(saved) : false;
    } catch { return false; }
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

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 顏色配置字典
  const theme = {
    appBg: isDarkMode ? 'bg-zinc-950' : 'bg-white',
    topBar: isDarkMode ? 'bg-red-950' : 'bg-[#e3342f]',
    bottomBar: isDarkMode ? 'bg-red-950' : 'bg-[#e3342f]',
    pillBg: isDarkMode ? 'bg-red-900 text-white' : 'bg-[#e3342f] text-white',
    colHeader: isDarkMode ? 'text-red-400 border-red-900/50' : 'text-[#e3342f] border-[#fce4ec]',
    rowEven: isDarkMode ? 'bg-zinc-900' : 'bg-white',
    rowOdd: isDarkMode ? 'bg-zinc-800' : 'bg-[#fce4ec]', // 淺粉紅色橫間
    routeNum: isDarkMode ? 'text-zinc-100' : 'text-gray-900',
    routeDest: isDarkMode ? 'text-zinc-300' : 'text-gray-700',
    routeLoc: isDarkMode ? 'text-zinc-500' : 'text-gray-400',
    etaPrimary: isDarkMode ? 'text-blue-400' : 'text-[#1e3a8a]', // 深藍色
    etaSecondary: isDarkMode ? 'text-blue-500/70' : 'text-[#1e3a8a]/70',
    etaMissed: isDarkMode ? 'text-zinc-500' : 'text-gray-400',
    tabActive: isDarkMode ? 'bg-white text-red-900' : 'bg-white text-[#e3342f]',
    tabInactive: isDarkMode ? 'border border-white/50 text-white' : 'border border-white/50 text-white hover:bg-white/10',
    // 座枱模式專用
    standCard: isDarkMode ? 'bg-zinc-900 border-zinc-800 shadow-black/20' : 'bg-white border-gray-200 shadow-lg',
    standBox: isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-200',
    standBoxMissed: isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gray-100 border-gray-200',
  };

  const LOCATIONS = [
    {
      id: "67D38E584B919815",
      filterId: "PARKYOHO",
      name: "峻巒",
      desc: "往市區",
      routes: ['68', '68F', '268M'],
      filterSeq: (eta) => eta.seq <= 5 && !eta.dest_tc.includes('峻巒')
    },
    {
      id: "0C943B7308FF4DCC",
      filterId: "YOHO",
      name: "形點 II",
      desc: "往峻巒",
      routes: ['68', '68F'],
      filterSeq: (eta) => eta.seq > 5
    },
    {
      id: "7917E395940F86AF",
      filterId: "YOHO",
      name: "形點 I",
      desc: "往峻巒",
      routes: ['68', '68F'],
      filterSeq: (eta) => eta.seq > 5
    },
    {
      id: "E481F7170B1F6FC3",
      filterId: "TUNNEL",
      name: "大欖隧道",
      desc: "往峻巒",
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
                displayDest = '峻巒'; 
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

        // 座枱模式補足空位 (確保有 3 條路線)
        if (loc.name.includes("峻巒") && isStandMode) {
            const requiredRoutes = ['68', '68F', '268M'];
            requiredRoutes.forEach(r => {
                if (!routesList.find(item => item.route === r)) {
                    let defaultDest = "市區";
                    if(r === '68') defaultDest = "峻巒";
                    if(r === '68F') defaultDest = "峻巒";
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
      setError('數據載入失敗');
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

  const filteredLocations = locationsData.filter(loc => 
    (activeTab === 'ALL' || loc.filterId === activeTab) && loc.routesData.length > 0
  );

  // ==========================================
  // 渲染：一般列表模式 (斑馬紋)
  // ==========================================
  const renderListMode = () => (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 text-center text-sm font-bold m-4 rounded-lg">
          {error}
        </div>
      )}

      {!loading && filteredLocations.length === 0 && (
        <div className="text-center py-20">
          <Bus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-bold">目前無相應班次</p>
        </div>
      )}

      {filteredLocations.map((loc, locIdx) => (
        <div key={locIdx} className="mb-8">
          
          <div className="px-4 pt-5 pb-3">
            <span className={`inline-block px-5 py-1.5 rounded-full font-bold text-sm shadow-sm ${theme.pillBg}`}>
              {loc.name}
            </span>
          </div>

          <div className={`flex justify-between px-5 py-2 text-xs font-bold border-b ${theme.colHeader}`}>
            <span>路線</span>
            <span>分鐘</span>
          </div>

          <div className="flex flex-col">
            {loc.routesData.map((route, rIdx) => {
              
              const isEven = rIdx % 2 === 0;
              const rowBg = isEven ? theme.rowEven : theme.rowOdd;
              
              const primaryEtaDate = route.etas[0]?.time;
              const secondaryEtaDate = route.etas[1]?.time;
              
              const primaryMins = primaryEtaDate ? getEtaMinutes(primaryEtaDate) : null;
              const secondaryMins = secondaryEtaDate ? getEtaMinutes(secondaryEtaDate) : null;

              const isMissed = primaryMins !== null && primaryMins < 0;
              const isImminent = primaryMins === 0;

              return (
                <div key={rIdx} className={`flex justify-between items-center px-5 py-4 transition-colors ${rowBg}`}>
                  <div className="flex flex-col">
                    <div className="flex items-end gap-2 leading-none">
                      <span className={`text-5xl font-black tracking-tight ${theme.routeNum}`}>
                        {route.route}
                      </span>
                    </div>
                    <span className={`text-sm font-bold mt-2 ${theme.routeDest}`}>
                      往 {route.dest}
                    </span>
                    <span className={`text-xs mt-0.5 ${theme.routeLoc}`}>
                      {loc.name} ({loc.desc})
                    </span>
                  </div>

                  <div className="flex flex-col items-end justify-center h-full min-w-[80px]">
                    {primaryMins === null ? (
                      <span className={`text-2xl font-black ${theme.etaMissed}`}>-</span>
                    ) : isMissed ? (
                      <div className="flex flex-col items-end">
                        <span className={`text-3xl font-black tracking-wide ${theme.etaMissed}`}>走咗啦</span>
                        {secondaryMins !== null && secondaryMins >= 0 && (
                          <span className={`text-lg font-bold mt-1 ${theme.etaSecondary}`}>
                            {secondaryMins}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end leading-none">
                        <span className={`text-5xl font-black ${theme.etaPrimary}`}>
                          {isImminent ? '即將' : primaryMins}
                        </span>
                        
                        <div className={`text-lg font-bold mt-2 flex items-center gap-1 ${theme.etaSecondary}`}>
                          {secondaryMins !== null && secondaryMins >= 0 ? (
                            <span>{secondaryMins}</span>
                          ) : (
                            <span className="opacity-0">-</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // ==========================================
  // 渲染：座枱模式 (橫向 3 欄，極巨化)
  // ==========================================
  const renderStandMode = () => {
    const parkYohoData = locationsData.find(loc => loc.id === "67D38E584B919815");

    if (!parkYohoData || parkYohoData.routesData.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <Bus className="w-20 h-20 text-gray-300 mb-4" />
          <p className="text-gray-400 font-bold text-2xl">目前無班次</p>
        </div>
      );
    }

    return (
      <div className="flex-1 grid grid-cols-3 gap-4 md:gap-6 p-4 md:p-6 w-full h-full min-h-0">
        {parkYohoData.routesData.slice(0, 3).map((route, rIdx) => {
          const displayEtas = [route.etas[0] || null, route.etas[1] || null];

          return (
            <div key={rIdx} className={`rounded-3xl p-4 md:p-6 flex flex-col gap-4 border-2 transition-colors h-full flex-1 ${theme.standCard}`}>
              
              {/* 標題區：巨大化路線與目的地 */}
              <div className={`flex flex-col items-center justify-center gap-2 pb-4 border-b-2 shrink-0 ${isDarkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
                <span className={`text-6xl md:text-7xl xl:text-8xl font-black tracking-tighter ${theme.routeNum}`}>
                  {route.route}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Navigation className={`w-5 h-5 md:w-6 md:h-6 shrink-0 ${theme.navIcon}`} />
                  <span className={`text-2xl md:text-3xl xl:text-4xl font-bold truncate tracking-tight text-center ${theme.routeDest}`}>
                    往 {route.dest}
                  </span>
                </div>
              </div>

              {/* 時間區：上下兩格填滿 */}
              <div className="grid grid-rows-2 gap-4 flex-1 min-h-0">
                {displayEtas.map((eta, eIdx) => {
                  if (!eta) {
                    return (
                      <div key={`empty-${eIdx}`} className={`flex items-center justify-center rounded-2xl border transition-colors h-full ${theme.standBoxMissed}`}>
                        <span className="text-4xl font-bold opacity-20">-</span>
                      </div>
                    );
                  }

                  const diffMins = getEtaMinutes(eta.time);
                  const isMissed = diffMins < 0;
                  const isImminent = diffMins === 0;

                  return (
                    <div 
                      key={eIdx}
                      className={`flex flex-col items-center justify-center rounded-2xl border transition-colors h-full relative overflow-hidden ${isMissed ? theme.standBoxMissed : theme.standBox}`}
                    >
                      {isMissed ? (
                        <span className={`text-5xl md:text-6xl xl:text-7xl font-black tracking-wide ${theme.etaMissed}`}>
                          走咗啦
                        </span>
                      ) : (
                        <span className={`text-[6rem] md:text-[8rem] xl:text-[11rem] font-black tracking-tighter leading-none ${theme.etaPrimary}`}>
                          {isImminent ? <span className="text-6xl md:text-7xl xl:text-8xl">即將</span> : diffMins}
                        </span>
                      )}

                      {eta.rmk && (
                        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs md:text-sm font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-200 text-gray-600'}`}>
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
    );
  };

  return (
    <div className={`h-screen flex flex-col font-sans transition-colors duration-300 overflow-hidden ${theme.appBg}`}>
      
      {/* 頂部紅底 Header */}
      <header className={`px-4 py-3 flex items-center justify-between shadow-sm z-20 shrink-0 transition-colors ${theme.topBar}`}>
        <div className="flex gap-2">
          {/* 日夜切換 */}
          <button className="p-1.5 text-white/80 hover:text-white transition-colors" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {/* 座枱模式切換 */}
          <button 
            className={`p-1.5 transition-colors rounded-full ${isStandMode ? 'bg-white/20 text-white shadow-inner' : 'text-white/80 hover:text-white'}`}
            onClick={() => setIsStandMode(!isStandMode)}
            title="座枱模式 (橫向巨型排版)"
          >
            <MonitorSmartphone className="w-5 h-5" />
          </button>
        </div>
        
        <h1 className="text-xl md:text-2xl font-bold tracking-widest text-white text-center flex-1">
          {isStandMode ? "峻巒交通全覽" : "香港巴士時間"}
        </h1>
        
        <button onClick={fetchData} className="p-1.5 text-white/80 hover:text-white transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* 內容區塊 */}
      <main className={`flex-1 w-full overflow-y-auto ${isStandMode ? 'flex flex-col' : ''}`}>
        {isStandMode ? renderStandMode() : renderListMode()}
      </main>

      {/* 底部導航列 (僅在一般模式顯示) */}
      {!isStandMode && (
        <footer className={`shrink-0 w-full p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-colors z-20 ${theme.bottomBar}`}>
          <div className="max-w-4xl mx-auto flex gap-2 sm:gap-4 justify-between">
            <button 
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all duration-200 
                ${activeTab === 'ALL' ? theme.tabActive : theme.tabInactive}`}
            >
              全部
            </button>
            <button 
              onClick={() => setActiveTab('PARKYOHO')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all duration-200 
                ${activeTab === 'PARKYOHO' ? theme.tabActive : theme.tabInactive}`}
            >
              峻巒
            </button>
            <button 
              onClick={() => setActiveTab('YOHO')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all duration-200 
                ${activeTab === 'YOHO' ? theme.tabActive : theme.tabInactive}`}
            >
              形點
            </button>
            <button 
              onClick={() => setActiveTab('TUNNEL')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all duration-200 
                ${activeTab === 'TUNNEL' ? theme.tabActive : theme.tabInactive}`}
            >
              大欖
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
