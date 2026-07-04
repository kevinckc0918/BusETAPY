import React, { useState, useEffect, useCallback } from 'react';
import { Bus, RefreshCw, Moon, Sun, MonitorSmartphone, CloudSun, AlertTriangle, Image as ImageIcon } from 'lucide-react';

// ==========================================
// 🖼️ 用家自訂相簿區 (USER PHOTOS)
// ==========================================
const USER_PHOTOS = [
  "/photo01.jpg",
  "/photo02.jpg",
  "/photo03.jpg"
];

// 天氣模式背景
const WEATHER_BG = "https://images.unsplash.com/photo-1543387807-68884c7f0b5d?q=80&w=1920&auto=format&fit=crop";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [locationsData, setLocationsData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('ALL');
  const [photoIndex, setPhotoIndex] = useState(0);
  
  // 天氣與天文台數據
  const [weatherInfo, setWeatherInfo] = useState({ temp: '--', icon: null, warnings: [] });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kmb_theme') || 'false'); } catch { return false; }
  });

  const [isStandMode, setIsStandMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kmb_stand_mode') || 'false'); } catch { return false; }
  });

  // 左側面板模式: 'PHOTO' 或 'WEATHER'
  const [leftPanelMode, setLeftPanelMode] = useState(() => {
    try { return localStorage.getItem('kmb_left_mode') || 'WEATHER'; } catch { return 'WEATHER'; }
  });

  const [now, setNow] = useState(new Date());

  // 儲存設定
  useEffect(() => {
    try { localStorage.setItem('kmb_theme', JSON.stringify(isDarkMode)); } catch (e) {}
  }, [isDarkMode]);

  useEffect(() => {
    try { localStorage.setItem('kmb_stand_mode', JSON.stringify(isStandMode)); } catch (e) {}
  }, [isStandMode]);

  useEffect(() => {
    try { localStorage.setItem('kmb_left_mode', leftPanelMode); } catch (e) {}
  }, [leftPanelMode]);

  // 時鐘計時器
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 相簿輪播計時器
  useEffect(() => {
    if (!isStandMode || leftPanelMode !== 'PHOTO') return;
    const photoTimer = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % USER_PHOTOS.length);
    }, 10000); // 每 10 秒切換一張相片
    return () => clearInterval(photoTimer);
  }, [isStandMode, leftPanelMode]);

  // 獲取香港天文台天氣數據
  const fetchWeather = useCallback(async () => {
    try {
      const [rhrRes, warnRes] = await Promise.all([
        fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc'),
        fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc')
      ]);
      const rhrData = await rhrRes.json();
      const warnData = await warnRes.json();

      // 提取天文台溫度與圖示
      const hkoTemp = rhrData.temperature?.data?.find(d => d.place === '香港天文台')?.value 
                      || rhrData.temperature?.data?.[0]?.value || '--';
      const iconId = rhrData.icon?.[0];

      // 提取並處理警告訊號
      const activeWarnings = warnData ? Object.values(warnData).map(w => ({
        code: w.code,
        name: w.name
      })) : [];

      setWeatherInfo({ temp: hkoTemp, icon: iconId, warnings: activeWarnings });
    } catch (err) {
      console.warn('天氣數據載入失敗', err);
    }
  }, []);

  useEffect(() => {
    fetchWeather(); // 初始化獲取
    const weatherTimer = setInterval(fetchWeather, 300000); // 每 5 分鐘更新天氣
    return () => clearInterval(weatherTimer);
  }, [fetchWeather]);

  const theme = {
    appBg: isDarkMode ? 'bg-zinc-950' : 'bg-white',
    topBar: isDarkMode ? 'bg-red-950' : 'bg-[#e3342f]',
    bottomBar: isDarkMode ? 'bg-red-950' : 'bg-[#e3342f]',
    pillBg: isDarkMode ? 'bg-red-900 text-white' : 'bg-[#e3342f] text-white',
    colHeader: isDarkMode ? 'text-red-400 border-red-900/50' : 'text-[#e3342f] border-[#fce4ec]',
    rowEven: isDarkMode ? 'bg-zinc-900' : 'bg-white',
    rowOdd: isDarkMode ? 'bg-zinc-800' : 'bg-[#fce4ec]',
    routeNum: isDarkMode ? 'text-zinc-100' : 'text-gray-900',
    routeDest: isDarkMode ? 'text-zinc-300' : 'text-gray-700',
    etaPrimaryDefault: isDarkMode ? 'text-zinc-100' : 'text-black', 
    etaSecondary: isDarkMode ? 'text-zinc-400' : 'text-gray-600',
    etaMissed: isDarkMode ? 'text-zinc-500' : 'text-gray-400',
    tabActive: isDarkMode ? 'bg-white text-red-900' : 'bg-white text-[#e3342f]',
    tabInactive: isDarkMode ? 'border border-white/50 text-white' : 'border border-white/50 text-white hover:bg-white/10'
  };

  const LOCATIONS = [
    {
      id: "67D38E584B919815", filterId: "PARKYOHO", name: "峻巒", desc: "往市區",
      routes: ['68', '68F', '268M'], filterSeq: (eta) => eta.seq <= 5 && !eta.dest_tc.includes('峻巒')
    },
    {
      id: "0C943B7308FF4DCC", filterId: "YOHO", name: "形點 II", desc: "往峻巒",
      routes: ['68', '68F'], filterSeq: (eta) => eta.seq > 5
    },
    {
      id: "7917E395940F86AF", filterId: "YOHO", name: "形點 I", desc: "往峻巒",
      routes: ['68', '68F'], filterSeq: (eta) => eta.seq > 5
    },
    {
      id: "E481F7170B1F6FC3", filterId: "TUNNEL", name: "大欖隧道", desc: "往峻巒",
      routes: ['268M'], filterSeq: (eta) => true
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
        if (loc.name.includes("峻巒")) allEtas = [...allEtas, ...parkYoho268MEtas];

        const routesList = [];
        loc.routes.forEach(routeNum => {
          const validEtas = allEtas.filter(eta => eta.route === routeNum && eta.eta && loc.filterSeq(eta));
          if (validEtas.length > 0) {
            const dests = [...new Set(validEtas.map(e => e.dest_tc))];
            dests.forEach(dest => {
              const destEtas = validEtas.filter(e => e.dest_tc === dest);
              destEtas.sort((a, b) => new Date(a.eta) - new Date(b.eta));
              let displayDest = dest;
              if (displayDest.includes('荃灣西')) displayDest = '荃灣西站'; 
              routesList.push({
                route: routeNum, dest: displayDest,
                etas: destEtas.slice(0, 2).map(e => ({ time: new Date(e.eta), rmk: e.rmk_tc !== "原定班次" ? e.rmk_tc : null }))
              });
            });
          }
        });

        if (loc.name.includes("峻巒") && isStandMode) {
            const requiredRoutes = ['68', '68F', '268M'];
            requiredRoutes.forEach(r => {
                if (!routesList.find(item => item.route === r)) {
                    routesList.push({ route: r, dest: r === '268M' ? "荃灣西站" : "峻巒", etas: [] });
                }
            });
        }
        routesList.sort((a, b) => a.route.localeCompare(b.route, undefined, { numeric: true }));
        return { ...loc, routesData: routesList };
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getEtaMinutes = (etaDate) => Math.floor((etaDate - now) / 60000);

  // 格式化中文日期
  const formatChineseDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 ${weekday}`;
  };

  // 天氣警告顏色對照表
  const getWarningStyle = (code) => {
    const map = {
      WFIREY: 'bg-yellow-500 text-yellow-950', WFIRER: 'bg-red-500 text-white',
      WHOT: 'bg-red-600 text-white', WCOLD: 'bg-blue-400 text-blue-950',
      WMSGNL: 'bg-gray-600 text-white',
      WRAINA: 'bg-yellow-400 text-yellow-900', WRAINR: 'bg-red-600 text-white', WRAINB: 'bg-black text-white border border-gray-500',
      WTS: 'bg-yellow-600 text-yellow-950',
      TC1: 'bg-gray-200 text-gray-800', TC3: 'bg-yellow-500 text-yellow-950',
      TC8NE: 'bg-zinc-800 text-white', TC8NW: 'bg-zinc-800 text-white', TC8SE: 'bg-zinc-800 text-white', TC8SW: 'bg-zinc-800 text-white',
      TC9: 'bg-zinc-900 text-white', TC10: 'bg-red-800 text-white'
    };
    return map[code] || 'bg-white/20 text-white backdrop-blur-md';
  };

  // ==========================================
  // 共用組件：單一路線橫向斑馬紋
  // ==========================================
  const renderRow = (route, rIdx) => {
    const isEven = rIdx % 2 === 0;
    const rowBg = isEven ? theme.rowEven : theme.rowOdd;
    const primaryMins = route.etas[0] ? getEtaMinutes(route.etas[0].time) : null;
    const secondaryMins = route.etas[1] ? getEtaMinutes(route.etas[1].time) : null;
    const isMissed = primaryMins !== null && primaryMins < 0;
    const isImminent = primaryMins === 0;

    let dynamicEtaColor = theme.etaPrimaryDefault;
    if (primaryMins !== null && primaryMins >= 0) {
      if (primaryMins <= 5) dynamicEtaColor = isDarkMode ? 'text-red-400' : 'text-red-600';
      else if (primaryMins <= 10) dynamicEtaColor = isDarkMode ? 'text-orange-400' : 'text-orange-500';
    }

    return (
      <div key={rIdx} className={`flex justify-between items-center px-4 md:px-5 py-3 md:py-4 transition-colors ${rowBg}`}>
        <div className="flex flex-col items-start justify-center text-left min-w-0 pr-2">
          {/* 加入響應式字體大小，適應 30% 較窄空間 */}
          <span className={`text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight leading-none ${theme.routeNum} truncate w-full`}>
            {route.route}
          </span>
          <span className={`text-xs lg:text-sm xl:text-base font-bold mt-1.5 ${theme.routeDest} truncate w-full`}>
            往 {route.dest}
          </span>
        </div>
        <div className="flex flex-col items-end justify-center h-full min-w-[70px] text-right shrink-0">
          {primaryMins === null ? (
            <span className={`text-2xl lg:text-3xl font-black ${theme.etaMissed}`}>-</span>
          ) : isMissed ? (
            <div className="flex flex-col items-end">
              <span className={`text-2xl lg:text-3xl xl:text-4xl font-black tracking-wide ${theme.etaMissed}`}>已開出</span>
              {secondaryMins !== null && secondaryMins >= 0 && <span className={`text-base lg:text-lg xl:text-xl font-bold mt-1 ${theme.etaSecondary}`}>{secondaryMins}</span>}
            </div>
          ) : (
            <div className="flex flex-col items-end leading-none">
              {/* 智能字體縮放 */}
              <span className={`${isImminent ? 'text-2xl lg:text-3xl xl:text-4xl tracking-wide' : 'text-4xl lg:text-5xl xl:text-6xl'} font-black transition-colors duration-300 ${dynamicEtaColor}`}>
                {isImminent ? '即將' : primaryMins}
              </span>
              <div className={`text-base lg:text-lg xl:text-xl font-bold mt-2 flex items-center gap-1 ${theme.etaSecondary}`}>
                {secondaryMins !== null && secondaryMins >= 0 ? <span>{secondaryMins}</span> : <span className="opacity-0">-</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==========================================
  // 🖼️ 渲染：雙屏座枱模式 (左 70% 內容, 右 30% 巴士)
  // ==========================================
  const renderStandMode = () => {
    const parkYohoData = locationsData.find(loc => loc.id === "67D38E584B919815");
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');

    return (
      <div className="flex flex-row w-full h-full overflow-hidden relative bg-black">
        
        {/* ================= 左側 70% (自由切換) ================= */}
        <div className="w-[70%] h-full relative overflow-hidden bg-black shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] z-0 shrink-0">
          
          {/* 天氣模式畫面 */}
          {leftPanelMode === 'WEATHER' && (
            <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12 lg:p-16">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${WEATHER_BG})` }} />
              <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/30 to-black/80" />
              
              {/* 天氣模式 - 時鐘與日期 (上) - 整體縮細 */}
              <div className="relative z-10 text-white drop-shadow-lg">
                <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-wide text-white/90 mb-2">
                  {formatChineseDate(now)}
                </h2>
                {/* 使用 tabular-nums 並縮小字體 */}
                <div className="flex items-center tabular-nums">
                  <span className="text-[4rem] md:text-[5.5rem] lg:text-[7rem] xl:text-[8.5rem] font-black leading-none tracking-tight drop-shadow-2xl">
                    {hh}:{mm}:{ss}
                  </span>
                </div>
              </div>

              {/* 天氣模式 - 天文台資訊與警告 (下) - 整體縮細 */}
              <div className="relative z-10 flex flex-col items-start gap-3 text-white">
                <div className="flex items-center gap-3">
                  {weatherInfo.icon && (
                    <img 
                      src={`https://www.hko.gov.hk/images/HKOWxIconOutline/pic${weatherInfo.icon}.png`} 
                      alt="Weather Icon" 
                      className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 drop-shadow-xl"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <div className="flex flex-col items-start drop-shadow-xl">
                    <span className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-none tracking-tighter">
                      {weatherInfo.temp}°<span className="text-3xl md:text-4xl lg:text-5xl">C</span>
                    </span>
                    <span className="text-xs md:text-sm lg:text-base font-bold text-white/80 tracking-widest mt-1 ml-1">香港天文台</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:gap-3 max-w-full">
                  {weatherInfo.warnings.map((warn, idx) => (
                    <div key={idx} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-black text-base md:text-lg lg:text-xl shadow-xl flex items-center gap-2 animate-pulse ${getWarningStyle(warn.code)}`}>
                      <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                      {warn.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 相簿模式畫面 */}
          {leftPanelMode === 'PHOTO' && (
            <>
              {USER_PHOTOS.map((src, i) => (
                <img key={i} src={src} alt="Slideshow" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${i === photoIndex ? 'opacity-100' : 'opacity-0'}`} />
              ))}
            </>
          )}

        </div>

        {/* ================= 右側 30% (永久巴士資訊) ================= */}
        <div className={`w-[30%] h-full flex flex-col z-10 transition-colors shadow-2xl ${theme.appBg}`}>
          <div className="px-4 pt-5 pb-3 border-b border-gray-500/20 shrink-0 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Bus className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                <span className={`font-black tracking-wide text-base md:text-lg ${isDarkMode ? 'text-zinc-200' : 'text-gray-800'}`}>峻巒總站</span>
             </div>
             <span className={`text-[10px] md:text-xs font-bold ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                更新: {now.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
             </span>
          </div>
          <div className={`flex justify-between px-4 py-2 text-sm md:text-base font-bold border-b shrink-0 ${theme.colHeader}`}>
            <span>路線</span>
            <span>分鐘</span>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col">
            {parkYohoData?.routesData.map((route, rIdx) => renderRow(route, rIdx))}
            <div className="flex-1 min-h-[20px]"></div>
          </div>
        </div>

      </div>
    );
  };

  // ==========================================
  // 渲染：一般列表模式 (含底部導航)
  // ==========================================
  const renderListMode = () => {
    const filteredLocations = locationsData.filter(loc => (activeTab === 'ALL' || loc.filterId === activeTab) && loc.routesData.length > 0);
    return (
      <div className="w-full max-w-4xl mx-auto pb-24">
        {error && <div className="bg-red-50 text-red-600 p-3 text-center text-sm font-bold m-4 rounded-lg">{error}</div>}
        {!loading && filteredLocations.length === 0 && (
          <div className="text-center py-20"><Bus className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-400 font-bold">目前無相應班次</p></div>
        )}
        {filteredLocations.map((loc, locIdx) => (
          <div key={locIdx} className="mb-8 mt-2">
            <div className="px-5 pt-4 pb-3">
              <span className={`inline-block px-5 py-1.5 rounded-full font-bold text-base shadow-sm ${theme.pillBg}`}>{loc.name}</span>
            </div>
            <div className={`flex justify-between px-5 py-2 text-base font-bold border-b ${theme.colHeader}`}>
              <span>路線</span><span>分鐘</span>
            </div>
            <div className="flex flex-col">
              {loc.routesData.map((route, rIdx) => renderRow(route, rIdx))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`h-screen flex flex-col font-sans transition-colors duration-300 overflow-hidden ${theme.appBg}`}>
      
      {/* 頂部 Header */}
      <header className={`px-4 py-3 flex items-center justify-between shadow-sm z-20 shrink-0 transition-colors ${theme.topBar}`}>
        <div className="flex gap-1.5">
          <button className="p-1.5 text-white/80 hover:text-white transition-colors" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {/* 主座枱模式切換 */}
          <button 
            className={`p-1.5 transition-colors rounded-full ${isStandMode ? 'bg-white/20 text-white shadow-inner ring-1 ring-white/50' : 'text-white/80 hover:text-white'}`}
            onClick={() => setIsStandMode(!isStandMode)}
            title="橫向座枱模式"
          >
            <MonitorSmartphone className="w-5 h-5" />
          </button>

          {/* 左面板 內部切換 (只限座枱模式出現) */}
          {isStandMode && (
            <button 
              className={`ml-1 p-1.5 transition-all rounded-full bg-white/20 text-white border border-white/40 shadow-inner flex items-center gap-1.5 px-3`}
              onClick={() => setLeftPanelMode(leftPanelMode === 'WEATHER' ? 'PHOTO' : 'WEATHER')}
              title="切換相片/天氣"
            >
              {leftPanelMode === 'WEATHER' ? (
                <><ImageIcon className="w-4 h-4" /><span className="text-xs font-bold hidden sm:inline">轉相簿</span></>
              ) : (
                <><CloudSun className="w-4 h-4" /><span className="text-xs font-bold hidden sm:inline">轉天氣</span></>
              )}
            </button>
          )}
        </div>
        
        {/* 全局統一標題 */}
        <h1 className="text-xl font-bold tracking-widest text-white text-center flex-1 pr-6 md:pr-0">
          峻巒巴士到站預報
        </h1>
        
        <button onClick={() => { fetchData(); fetchWeather(); }} className="p-1.5 text-white/80 hover:text-white transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* 主內容區 */}
      <main className={`flex-1 w-full overflow-hidden ${isStandMode ? 'flex' : 'overflow-y-auto'}`}>
        {!isStandMode ? renderListMode() : renderStandMode()}
      </main>

      {/* 底部導航列 (僅在一般模式顯示) */}
      {!isStandMode && (
        <footer className={`fixed bottom-0 left-0 w-full p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-colors z-20 ${theme.bottomBar}`}>
          <div className="max-w-4xl mx-auto flex gap-2 sm:gap-4 justify-between">
            <button onClick={() => setActiveTab('ALL')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all duration-200 ${activeTab === 'ALL' ? theme.tabActive : theme.tabInactive}`}>全部</button>
            <button onClick={() => setActiveTab('PARKYOHO')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all duration-200 ${activeTab === 'PARKYOHO' ? theme.tabActive : theme.tabInactive}`}>峻巒</button>
            <button onClick={() => setActiveTab('YOHO')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all duration-200 ${activeTab === 'YOHO' ? theme.tabActive : theme.tabInactive}`}>形點</button>
            <button onClick={() => setActiveTab('TUNNEL')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all duration-200 ${activeTab === 'TUNNEL' ? theme.tabActive : theme.tabInactive}`}>大欖</button>
          </div>
        </footer>
      )}
      
    </div>
  );
}
