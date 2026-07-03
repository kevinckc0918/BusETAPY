import React, { useState, useEffect, useCallback } from 'react';
import { Bus, RefreshCw, Moon, Sun, MonitorSmartphone, Image as ImageIcon } from 'lucide-react';

// ==========================================
// 🖼️ 用家自訂相簿區 (USER PHOTOS)
// 在這裡放入你的 JPG 圖片網址或本地路徑
// ==========================================
const USER_PHOTOS = [
  "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?q=80&w=1920&auto=format&fit=crop", // 風景 1
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1920&auto=format&fit=crop", // 風景 2
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920&auto=format&fit=crop"  // 風景 3
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [locationsData, setLocationsData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('ALL');
  
  // 相簿輪播狀態
  const [photoIndex, setPhotoIndex] = useState(0);
  
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

  // 儲存設定
  useEffect(() => {
    try { localStorage.setItem('kmb_theme', JSON.stringify(isDarkMode)); } catch (e) {}
  }, [isDarkMode]);

  useEffect(() => {
    try { localStorage.setItem('kmb_stand_mode', JSON.stringify(isStandMode)); } catch (e) {}
  }, [isStandMode]);

  // 時鐘與相簿輪播計時器
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isStandMode) return;
    const photoTimer = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % USER_PHOTOS.length);
    }, 10000); // 每 10 秒切換一張相片
    return () => clearInterval(photoTimer);
  }, [isStandMode]);

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
    routeLoc: isDarkMode ? 'text-zinc-500' : 'text-gray-400',
    etaPrimary: isDarkMode ? 'text-zinc-100' : 'text-black', // 由藍色改為黑色 (暗黑模式下為白色)
    etaSecondary: isDarkMode ? 'text-zinc-400' : 'text-gray-600', // 由淺藍色改為深灰色 (暗黑模式下為淺灰色)
    etaMissed: isDarkMode ? 'text-zinc-500' : 'text-gray-400',
    tabActive: isDarkMode ? 'bg-white text-red-900' : 'bg-white text-[#e3342f]',
    tabInactive: isDarkMode ? 'border border-white/50 text-white' : 'border border-white/50 text-white hover:bg-white/10'
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
          const validEtas = allEtas.filter(eta => eta.route === routeNum && eta.eta && loc.filterSeq(eta));
          if (validEtas.length > 0) {
            const dests = [...new Set(validEtas.map(e => e.dest_tc))];
            dests.forEach(dest => {
              const destEtas = validEtas.filter(e => e.dest_tc === dest);
              destEtas.sort((a, b) => new Date(a.eta) - new Date(b.eta));
              let displayDest = dest;
              if (displayDest.includes('荃灣西')) displayDest = '荃灣西站'; 
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

        // 確保 68, 68F, 268M 齊全，以維持排版
        if (loc.name.includes("峻巒") && isStandMode) {
            const requiredRoutes = ['68', '68F', '268M'];
            requiredRoutes.forEach(r => {
                if (!routesList.find(item => item.route === r)) {
                    let defaultDest = "市區";
                    if(r === '68') defaultDest = "峻巒";
                    if(r === '68F') defaultDest = "峻巒";
                    if(r === '268M') defaultDest = "荃灣西站";
                    routesList.push({ route: r, dest: defaultDest, etas: [] });
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

  // 共用的單一路線橫向斑馬紋渲染組件
  const renderRow = (route, rIdx, locName, locDesc) => {
    const isEven = rIdx % 2 === 0;
    const rowBg = isEven ? theme.rowEven : theme.rowOdd;
    const primaryMins = route.etas[0] ? getEtaMinutes(route.etas[0].time) : null;
    const secondaryMins = route.etas[1] ? getEtaMinutes(route.etas[1].time) : null;
    const isMissed = primaryMins !== null && primaryMins < 0;
    const isImminent = primaryMins === 0;

    return (
      <div key={rIdx} className={`flex justify-between items-center px-5 py-3 md:py-4 transition-colors ${rowBg}`}>
        
        {/* 左側資訊區：強制靠左對齊 */}
        <div className="flex flex-col items-start justify-center text-left">
          <span className={`text-5xl lg:text-6xl font-black tracking-tight leading-none ${theme.routeNum}`}>
            {route.route}
          </span>
          <span className={`text-sm lg:text-base font-bold mt-1.5 ${theme.routeDest}`}>
            往 {route.dest}
          </span>
          {/* 在相架模式下隱藏車站小字，保持畫面簡潔 */}
          {!isStandMode && (
             <span className={`text-[10px] mt-0.5 ${theme.routeLoc}`}>
               {locName} ({locDesc})
             </span>
          )}
        </div>
        
        {/* 右側時間區：靠右對齊 */}
        <div className="flex flex-col items-end justify-center h-full min-w-[80px] text-right">
          {primaryMins === null ? (
            <span className={`text-3xl font-black ${theme.etaMissed}`}>-</span>
          ) : isMissed ? (
            <div className="flex flex-col items-end">
              <span className={`text-3xl lg:text-4xl font-black tracking-wide ${theme.etaMissed}`}>
                走咗啦
              </span>
              {secondaryMins !== null && secondaryMins >= 0 && (
                <span className={`text-lg lg:text-xl font-bold mt-1 ${theme.etaSecondary}`}>
                  {secondaryMins}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end leading-none">
              <span className={`text-5xl lg:text-6xl font-black ${theme.etaPrimary}`}>
                {isImminent ? '即將' : primaryMins}
              </span>
              <div className={`text-lg lg:text-xl font-bold mt-2 flex items-center gap-1 ${theme.etaSecondary}`}>
                {secondaryMins !== null && secondaryMins >= 0 ? <span>{secondaryMins}</span> : <span className="opacity-0">-</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };


  // ==========================================
  // 🖼️ 渲染：相架座枱模式 (左 60% 相片, 右 40% 斑馬紋 ETA)
  // ==========================================
  const renderPhotoFrameMode = () => {
    // 座枱模式只顯示峻巒總站
    const parkYohoData = locationsData.find(loc => loc.id === "67D38E584B919815");

    return (
      <div className="flex flex-row w-full h-full overflow-hidden bg-black relative">
        
        {/* 左側 60%：相簿輪播區 */}
        <div className="w-[60%] h-full relative overflow-hidden bg-black shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] z-0 shrink-0">
          {USER_PHOTOS.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="Slideshow"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out
                ${i === photoIndex ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>

        {/* 右側 40%：斑馬紋交通資訊面板 */}
        <div className={`w-[40%] h-full flex flex-col z-10 transition-colors shadow-2xl ${theme.appBg}`}>
          
          {/* 右側頂部小標題 */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-500/20 shrink-0 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Bus className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                <span className={`font-black tracking-wide text-lg ${isDarkMode ? 'text-zinc-200' : 'text-gray-800'}`}>
                  峻巒總站
                </span>
             </div>
             <span className={`text-xs font-bold ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                {now.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
             </span>
          </div>

          {/* 表頭： 路線 | 分鐘 */}
          <div className={`flex justify-between px-5 py-2 text-sm font-bold border-b shrink-0 ${theme.colHeader}`}>
            <span>路線</span>
            <span>分鐘</span>
          </div>

          {/* 斑馬紋列表 */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {parkYohoData?.routesData.map((route, rIdx) => 
               renderRow(route, rIdx, parkYohoData.name, parkYohoData.desc)
            )}
            {/* 底部補白 */}
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
    const filteredLocations = locationsData.filter(loc => 
      (activeTab === 'ALL' || loc.filterId === activeTab) && loc.routesData.length > 0
    );

    return (
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
          <div key={locIdx} className="mb-8 mt-2">
            
            {/* 車站紅色 Pill 標籤 */}
            <div className="px-5 pt-4 pb-3">
              <span className={`inline-block px-5 py-1.5 rounded-full font-bold text-sm shadow-sm ${theme.pillBg}`}>
                {loc.name}
              </span>
            </div>

            {/* 表頭 */}
            <div className={`flex justify-between px-5 py-2 text-xs font-bold border-b ${theme.colHeader}`}>
              <span>路線</span>
              <span>分鐘</span>
            </div>
            
            {/* 路線行 */}
            <div className="flex flex-col">
              {loc.routesData.map((route, rIdx) => renderRow(route, rIdx, loc.name, loc.desc))}
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
          <button 
            className={`p-1.5 transition-colors rounded-full ${isStandMode ? 'bg-white/20 text-white shadow-inner' : 'text-white/80 hover:text-white'}`}
            onClick={() => setIsStandMode(!isStandMode)}
            title="相架模式"
          >
            <MonitorSmartphone className="w-5 h-5" />
          </button>
        </div>
        
        {/* 全局統一標題 */}
        <h1 className="text-xl font-bold tracking-widest text-white text-center flex-1">
          峻巒巴士到站預報
        </h1>
        
        <button onClick={fetchData} className="p-1.5 text-white/80 hover:text-white transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* 主內容區 */}
      <main className={`flex-1 w-full overflow-hidden ${isStandMode ? 'flex' : 'overflow-y-auto'}`}>
        {isStandMode ? renderPhotoFrameMode() : renderListMode()}
      </main>

      {/* 底部導航列 (僅在一般模式顯示) */}
      {!isStandMode && (
        <footer className={`fixed bottom-0 left-0 w-full p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-colors z-20 ${theme.bottomBar}`}>
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
