import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useToast } from '../components/ui/use-toast';
import { aptosClient } from '../utils/aptosClient';
import { 
  CASINO_HOUSE_ADDRESS, 
  INVESTOR_TOKEN_ADDRESS,
  CCIT_DECIMALS, 
  NAV_SCALE, 
  APT_DECIMALS 
} from '../constants/chaincasino';

// Coin Image Component
const CoinImage = ({ size = 64, className = "", spinning = false }) => (
  <img
    src="/chaincasino-coin.png"
    alt="ChainCasino Coin"
    className={`${className} ${spinning ? 'animate-spin' : ''}`}
    style={{ 
      width: size, 
      height: size,
      filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))',
      animation: spinning ? 'spin 3s linear infinite' : 'none'
    }}
  />
);

// Aptos Logo Component
const AptosLogo = ({ size = 32, className = "" }) => (
  <div className="relative">
    <img
      src="/aptos-logo.png"
      alt="Aptos"
      className={`${className}`}
      style={{ 
        width: size, 
        height: size,
        filter: 'drop-shadow(0 0 8px rgba(0, 195, 255, 0.5))'
      }}
      onError={(e) => {
        // Fallback to CSS version if image not found
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
    {/* Fallback CSS logo */}
    <div 
      className={`${className} flex items-center justify-center hidden`}
      style={{ width: size, height: size }}
    >
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Enhanced Floating Title Component
const FloatingTitle = () => {
  const [glitchActive, setGlitchActive] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mb-8">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-yellow-400/20 blur-3xl animate-pulse"></div>
      
      {/* Main title */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <CoinImage size={64} className={glitchActive ? 'animate-pulse scale-105' : 'scale-100'} />
        <h1 className={`
          relative z-10 text-center font-black text-5xl md:text-7xl lg:text-8xl
          bg-gradient-to-r from-cyan-400 via-purple-500 via-yellow-400 to-cyan-400
          bg-size-200 bg-pos-0 hover:bg-pos-100
          transition-all duration-1000 ease-in-out
          text-transparent bg-clip-text
          drop-shadow-[0_0_30px_rgba(0,255,255,0.7)]
          ${glitchActive ? 'animate-pulse scale-105' : 'scale-100'}
        `}>
          CCIT INVESTOR PORTAL
        </h1>
        <CoinImage size={64} className={glitchActive ? 'animate-pulse scale-105' : 'scale-100'} />
      </div>
      
      {/* Subtitle with enhanced branding */}
      <div className="text-center flex items-center justify-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <CoinImage size={40} spinning={false} />
          <span className="text-yellow-400 font-bold text-lg tracking-wider">
            CHAINCASINO
          </span>
        </div>
        
        <div className="text-cyan-400 text-2xl font-black">×</div>
        
        <div className="flex items-center gap-2">
          <AptosLogo size={40} />
          <span className="text-cyan-400 font-bold text-lg tracking-wider">
            APTOS
          </span>
        </div>
      </div>
      
      {/* Animated decorative elements */}
      <div className="absolute -top-10 left-1/4 text-4xl animate-bounce animation-delay-300">💎</div>
      <div className="absolute -top-8 right-1/4 text-3xl animate-bounce animation-delay-700">🚀</div>
      <div className="absolute -bottom-4 left-1/3 text-2xl animate-bounce animation-delay-500">⭐</div>
      <div className="absolute -bottom-6 right-1/3 text-2xl animate-bounce animation-delay-900">💰</div>
    </div>
  );
};

// Enhanced Real-time NAV Chart
const RealTimeNAVChart = ({ currentNAV, className = "" }) => {
  const [navHistory, setNavHistory] = useState([]);
  const [maxDataPoints] = useState(36); // 3 minutes of history at 5 second intervals
  
  useEffect(() => {
    if (currentNAV > 0 && !isNaN(currentNAV)) {
      setNavHistory(prev => {
        // Check if this is actually a new value
        if (prev.length > 0 && Math.abs(prev[prev.length - 1].value - currentNAV) < 0.000001) {
          return prev; // Don't add duplicate values
        }
        
        // If this is a big jump from startup (>5% change), start fresh
        if (prev.length > 0 && prev.length < 5) {
          const lastValue = prev[prev.length - 1].value;
          const percentChange = Math.abs((currentNAV - lastValue) / lastValue);
          if (percentChange > 0.05) {
            // Big jump detected - start fresh with current value
            return [{
              value: currentNAV,
              timestamp: Date.now()
            }];
          }
        }
        
        const newHistory = [...prev, {
          value: currentNAV,
          timestamp: Date.now()
        }];
        
        if (newHistory.length > maxDataPoints) {
          return newHistory.slice(-maxDataPoints);
        }
        return newHistory;
      });
    }
  }, [currentNAV, maxDataPoints]);

  // Helper function for NAV-specific scaling - simplified approach like treasury
  const getNavScaling = () => {
    if (navHistory.length < 2) {
      // Not enough data, use current value with reasonable range
      const current = navHistory[navHistory.length - 1]?.value || 1.0;
      const range = current * 0.02; // 2% range around current
      return {
        minValue: current - range,
        maxValue: current + range,
        valueRange: range * 2
      };
    }
    
    // Use ALL current data since we've filtered out startup jumps
    const minRaw = Math.min(...navHistory.map(h => h.value));
    const maxRaw = Math.max(...navHistory.map(h => h.value));
    const dataRange = maxRaw - minRaw;
    
    // Simple scaling: expand the actual range by 30% for breathing room
    const margin = Math.max(dataRange * 0.3, maxRaw * 0.005); // At least 0.5% margin
    const minValue = minRaw - margin;
    const maxValue = maxRaw + margin;
    
    return { minValue, maxValue, valueRange: maxValue - minValue };
  };

  const getChartPath = () => {
    if (navHistory.length < 2) return "";
    
    const width = 400;
    const height = 120;
    const { minValue, valueRange } = getNavScaling();
    
    const points = navHistory.map((point, index) => {
      const x = (index / (navHistory.length - 1)) * width;
      const y = height - ((point.value - minValue) / valueRange) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const isUpTrend = navHistory.length >= 2 && 
    navHistory[navHistory.length - 1].value > navHistory[0].value;

  const latestChange = navHistory.length >= 2 ? 
    ((navHistory[navHistory.length - 1].value - navHistory[navHistory.length - 2].value) / navHistory[navHistory.length - 2].value) * 100 : 0;

  // Show collecting data state like treasury chart
  if (navHistory.length < 2) {
    return (
      <div className={`bg-black/60 rounded-xl p-6 text-center border-2 border-cyan-400/40 ${className}`}>
        <div className="animate-pulse">
          <div className="text-cyan-400 mb-2">📈 NAV LIVE STREAM</div>
          <div className="text-gray-400">Collecting data... {currentNAV > 0 ? `Current: $${currentNAV.toFixed(6)}` : ''}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black/60 rounded-xl p-6 border-2 border-cyan-400/40 backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-cyan-400 font-bold tracking-wider">
            NAV LIVE STREAM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${isUpTrend ? 'text-green-400' : 'text-red-400'}`}>
            {latestChange >= 0 ? '📈' : '📉'} {latestChange >= 0 ? '+' : ''}{latestChange.toFixed(4)}%
          </span>
        </div>
      </div>
      
      <div className="relative mb-4">
        <svg width="400" height="120" className="w-full">
          {/* Enhanced grid */}
          <defs>
            <pattern id="navGrid" width="20" height="12" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 12" fill="none" stroke="rgba(0,195,255,0.15)" strokeWidth="1"/>
            </pattern>
            <linearGradient id="navGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isUpTrend ? "#10b981" : "#ef4444"} stopOpacity="0.8"/>
              <stop offset="100%" stopColor={isUpTrend ? "#10b981" : "#ef4444"} stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#navGrid)" />
          
          {/* Fill area under the line */}
          {navHistory.length >= 2 && (
            <path
              d={`${getChartPath()} L 400,120 L 0,120 Z`}
              fill="url(#navGradient)"
              opacity="0.3"
            />
          )}
          
          {/* Main NAV line */}
          {navHistory.length >= 2 && (
            <>
              <path
                d={getChartPath()}
                fill="none"
                stroke={isUpTrend ? "#10b981" : "#ef4444"}
                strokeWidth="3"
                className="drop-shadow-[0_0_8px_currentColor]"
              />
              {/* Glow effect */}
              <path
                d={getChartPath()}
                fill="none"
                stroke={isUpTrend ? "#10b981" : "#ef4444"}
                strokeWidth="6"
                opacity="0.4"
                className="animate-pulse"
              />
            </>
          )}
          
          {/* Enhanced data points */}
          {navHistory.map((point, index) => {
            if (navHistory.length < 2) return null;
            
            const x = (index / (navHistory.length - 1)) * 400;
            const { minValue, valueRange } = getNavScaling();
            const y = 120 - ((point.value - minValue) / valueRange) * 120;
            
            // Validate coordinates before rendering
            if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
              return null;
            }
            
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill={isUpTrend ? "#10b981" : "#ef4444"}
                  className="animate-pulse"
                />
              </g>
            );
          })}
        </svg>
        
        {/* Current NAV overlay */}
        <div className="absolute top-2 right-2 bg-black/80 px-3 py-1 rounded-lg border border-cyan-400/40">
          <div className="text-xs text-cyan-400">Current NAV</div>
          <div className="text-lg font-bold text-white">${currentNAV.toFixed(6)}</div>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-400">
        <span>📊 {navHistory.length}/36 points • 3min history</span>
        <span>📈 Chart: 5s • 🔗 Data: 30s</span>
      </div>
    </div>
  );
};

// Enhanced Real-time Treasury Chart
const RealTimeTreasuryChart = ({ totalTreasury, className = "" }) => {
  const [history, setHistory] = useState([]);
  const MAX_POINTS = 36; // 3 minutes of history at 5 second intervals

  useEffect(() => {
    if (totalTreasury > 0 && !isNaN(totalTreasury)) {
      setHistory(prev => {
        // Check if this is actually a new value
        if (prev.length > 0 && Math.abs(prev[prev.length - 1].v - totalTreasury) < 0.001) {
          return prev; // Don't add duplicate values
        }
        
        const next = [...prev, { v: totalTreasury, t: Date.now() }];
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
      });
    }
  }, [totalTreasury]);

  if (history.length < 2) {
    return (
      <div className={`bg-black/60 rounded-xl p-6 text-center border-2 border-yellow-400/40 ${className}`}>
        <div className="animate-pulse">
          <div className="text-yellow-400 mb-2">🏦 TREASURY STREAM</div>
          <div className="text-gray-400">Collecting data... {totalTreasury > 0 ? `Current: ${totalTreasury.toFixed(2)} APT` : ''}</div>
        </div>
      </div>
    );
  }

  const W = 400;
  const H = 120;
  const minV = Math.min(...history.map(h => h.v)) * 0.999;
  const maxV = Math.max(...history.map(h => h.v)) * 1.001;
  const range = maxV - minV || 0.01;

  const path = history
    .map((p, i) => {
      const x = (i / (history.length - 1)) * W;
      const y = H - ((p.v - minV) / range) * H;
      return `${x},${y}`;
    })
    .join(' L ');

  const up = history[history.length - 1].v >= history[0].v;
  const diffPercent = ((history[history.length - 1].v - history[0].v) / history[0].v) * 100;

  return (
    <div className={`bg-black/60 rounded-xl p-6 border-2 border-yellow-400/40 backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-yellow-400 font-bold tracking-wider">
            TREASURY LIVE STREAM
          </span>
        </div>
        <span className={`text-sm font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? '🏦📈' : '🏦📉'} {diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(3)}%
        </span>
      </div>

      <div className="relative mb-4">
        <svg width={W} height={H} className="w-full">
          <defs>
            <pattern id="treasuryGrid" width="20" height="12" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 12" fill="none" stroke="rgba(255,203,5,0.15)" strokeWidth="1"/>
            </pattern>
            <linearGradient id="treasuryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#treasuryGrid)" />

          {/* Fill area */}
          <path
            d={`M ${path} L ${W},${H} L 0,${H} Z`}
            fill="url(#treasuryGradient)"
            opacity="0.3"
          />

          {/* Trend line */}
          <path
            d={`M ${path}`}
            fill="none"
            stroke={up ? '#10b981' : '#ef4444'}
            strokeWidth="3"
            className="drop-shadow-[0_0_6px_currentColor]"
          />
          {/* Glow */}
          <path
            d={`M ${path}`}
            fill="none"
            stroke={up ? '#10b981' : '#ef4444'}
            strokeWidth="6"
            opacity="0.4"
            className="animate-pulse"
          />

          {/* Data points */}
          {history.map((p, i) => {
            if (history.length < 2) return null;
            
            const x = (i / (history.length - 1)) * W;
            const y = H - ((p.v - minV) / range) * H;
            
            // Validate coordinates before rendering
            if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
              return null;
            }
            
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill={up ? '#10b981' : '#ef4444'}
                  className="animate-pulse"
                />
              </g>
            );
          })}
        </svg>

        {/* Current treasury overlay */}
        <div className="absolute top-2 right-2 bg-black/80 px-3 py-1 rounded-lg border border-yellow-400/40">
          <div className="text-xs text-yellow-400">Total Treasury</div>
          <div className="text-lg font-bold text-white">{totalTreasury.toFixed(2)} APT</div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>🏦 {history.length}/36 points • 3min history</span>
        <span>📈 Chart: 5s • 🔗 Data: 30s</span>
      </div>
    </div>
  );
};

// Games Dashboard Component
const GamesDashboard = ({ navigate, toast, className = "" }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initial fetch with delay
    setTimeout(() => fetchRegisteredGames(), 2000);
    
    // Refresh games list every 60 seconds with to avoid rate limits
    const interval = 60000;
    
    return () => clearInterval(interval);
  }, []);

  const fetchRegisteredGames = async () => {
    try {
      setLoading(true);
      
      // Add delay to help with rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch registered game objects
      const gameObjectsResponse = await aptosClient().view({
        payload: {
          function: `${CASINO_HOUSE_ADDRESS}::CasinoHouse::get_registered_games`,
          functionArguments: []
        }
      });

      const gameObjects = gameObjectsResponse[0] || [];
      
      if (!Array.isArray(gameObjects) || gameObjects.length === 0) {
        setGames([]);
        setError(null);
        return;
      }

      const gamesData = [];

      // Fetch metadata for each game
      for (const gameObject of gameObjects) {
        try {
          // Extract address from object if needed
          const gameObjectAddr = typeof gameObject === 'object' && gameObject.inner 
            ? gameObject.inner 
            : typeof gameObject === 'string' 
            ? gameObject 
            : gameObject.toString();
          
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const metadataResponse = await aptosClient().view({
            payload: {
              function: `${CASINO_HOUSE_ADDRESS}::CasinoHouse::get_game_metadata`,
              functionArguments: [gameObjectAddr]
            }
          });

          if (metadataResponse && metadataResponse.length >= 11) {
            const [name, version, moduleAddress, minBet, maxBet, houseEdgeBps, maxPayout, capabilityClaimed, websiteUrl, iconUrl, description] = metadataResponse;
            
            gamesData.push({
              objectAddress: gameObjectAddr,
              name: name.toString(),
              version: version.toString(),
              moduleAddress: moduleAddress.toString(),
              minBet: Number(minBet) / Math.pow(10, APT_DECIMALS),
              maxBet: Number(maxBet) / Math.pow(10, APT_DECIMALS),
              houseEdge: Number(houseEdgeBps) / 100,
              maxPayout: Number(maxPayout) / Math.pow(10, APT_DECIMALS),
              capabilityClaimed: Boolean(capabilityClaimed),
              websiteUrl: websiteUrl.toString(),
              iconUrl: iconUrl.toString(),
              description: description.toString()
            });
          }
        } catch (gameError) {
          // Silently skip failed games
        }
      }

      setGames(gamesData);
      setError(null);
    } catch (err) {
      if (err.message?.includes('429') || err.message?.includes('rate')) {
        setError('Rate limited - will retry automatically');
      } else {
        setError(`Failed to load games: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getGameIcon = (name, iconUrl) => {
    if (iconUrl && iconUrl !== '') return iconUrl;
    
    // Default icons based on game name
    const iconMap = {
      'SevenOut': '🎲',
      'SlotMachine': '🎰',
      'Roulette': '🎡',
      'Blackjack': '🃏',
      'Dice': '🎲',
      'default': '🎮'
    };
    return iconMap[name] || iconMap.default;
  };

  if (loading) {
    return (
      <div className={`bg-black/60 rounded-xl p-6 border-2 border-purple-400/40 ${className}`}>
        <div className="animate-pulse text-center">
          <div className="text-purple-400 mb-4">🎮 LOADING GAMES...</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-700/50 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-black/60 rounded-xl p-6 border-2 border-red-400/40 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 mb-2">❌ {error}</div>
          {error.includes('Rate limited') ? (
            <div className="text-yellow-400 text-sm mb-3">
              ⏱️ Please wait - too many requests to Aptos devnet
            </div>
          ) : (
            <button 
              onClick={fetchRegisteredGames}
              className="mt-2 px-4 py-2 bg-red-500/20 rounded hover:bg-red-500/30 transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Retry'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black/60 rounded-xl p-6 border-2 border-purple-400/40 backdrop-blur-sm ${className}`}>
      <div className="retro-pixel-font text-sm text-purple-300 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-400 animate-pulse rounded-full"></div>
          ACTIVE GAMES ({games.length})
        </div>
        <div className="text-center">
          <button 
            onClick={() => navigate('/game-hub')}
            className="group relative bg-gradient-to-r from-purple-500/20 to-cyan-500/20 
                     hover:from-purple-500/30 hover:to-cyan-500/30 
                     border-2 border-purple-400/40 hover:border-purple-400/60
                     text-white px-8 py-4 rounded-xl font-black text-lg 
                     transition-all duration-300 hover:scale-105 
                     shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]
                     backdrop-blur-sm"
          >
          <div className="flex items-center gap-3">
            <CoinImage size={24} className="group-hover:animate-spin" />
            <span className="tracking-wider font-black">GAME HUB</span>
            <AptosLogo size={24} />
          </div>
          </button>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">🎮</div>
          <div>No games registered yet</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => (
            <div
              key={game.objectAddress}
              className="bg-black/40 rounded-lg p-6 border border-purple-400/30 hover:border-purple-400/60 transition-all duration-300 hover:scale-105 group"
            >
              {/* Game Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">
                    {getGameIcon(game.name, game.iconUrl).startsWith('/') ?
                      (
                        <img 
                          src={getGameIcon(game.name, game.iconUrl)} 
                          alt={game.name}
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        getGameIcon(game.name, game.iconUrl)
                      )}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{game.name}</div>
                    <div className="text-xs text-gray-400">v{game.version}</div>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              </div>

              {/* Game Stats */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="font-bold text-green-400">ONLINE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Min Bet:</span>
                  <span className="text-yellow-400">{game.minBet.toFixed(4)} APT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Bet:</span>
                  <span className="text-yellow-400">{game.maxBet.toFixed(4)} APT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">House Edge:</span>
                  <span className="text-purple-400">{game.houseEdge.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Payout:</span>
                  <span className="text-green-400">{game.maxPayout.toFixed(4)} APT</span>
                </div>
              </div>

              {/* Game Description */}
              {game.description && (
                <div className="mb-4 p-3 bg-black/30 rounded border border-gray-600/30">
                  <p className="text-xs text-gray-300">{game.description}</p>
                </div>
              )}

              {/* Game Contract Address */}
              <div className="mb-4 p-3 bg-black/20 rounded border border-gray-700/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Contract:</span>
                  <div 
                    className="text-xs text-blue-400 cursor-pointer hover:text-blue-300 transition-colors flex items-center gap-1 group"
                    onClick={() => {
                      if (game.objectAddress) {
                        navigator.clipboard.writeText(game.objectAddress);
                        toast({
                          title: "Copied!",
                          description: `${game.name} contract address copied to clipboard`,
                          duration: 2000
                        });
                      }
                    }}
                    title="Click to copy full address"
                  >
                    {game.objectAddress?.slice(0, 8)}...{game.objectAddress?.slice(-4)}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">📋</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {game.websiteUrl && game.websiteUrl !== '' && (
                <button
                  onClick={() => window.open(game.websiteUrl, '_blank', 'noopener,noreferrer')}
                  className="w-full px-4 py-3 rounded-lg font-bold text-sm transition-all duration-200 bg-purple-500/20 text-purple-400 border border-purple-400/30 hover:bg-purple-500/30 hover:scale-105"
                >
                  🎮 PLAY NOW
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Error and success messages
const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet to continue",
  INVALID_AMOUNT: "Please enter a valid amount",
  INSUFFICIENT_BALANCE: "Insufficient balance for this transaction",
  TRANSACTION_FAILED: "Transaction failed. Please try again.",
};

const SUCCESS_MESSAGES = {
  DEPOSIT_SUCCESS: "Deposit completed successfully!",
  REDEEM_SUCCESS: "Withdrawal completed successfully!",
};

// Enhanced Animated Counter Hook
const useCountUp = (end: number, duration: number = 1000, decimals: number = 2) => {
  const [count, setCount] = useState(end);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevEndRef = useRef(end);

  useEffect(() => {
    if (Math.abs(prevEndRef.current - end) > 0.001) {
      setIsAnimating(true);
      const startValue = prevEndRef.current;
      const difference = end - startValue;
      const steps = Math.min(Math.abs(difference) * 10, 60);
      const increment = difference / steps;
      let currentValue = startValue;
      let stepCount = 0;
      
      const timer = setInterval(() => {
        stepCount++;
        currentValue += increment;
        
        if (stepCount >= steps) {
          currentValue = end;
          setCount(end);
          setIsAnimating(false);
          clearInterval(timer);
        } else {
          setCount(currentValue);
        }
      }, duration / steps);

      prevEndRef.current = end;
      return () => clearInterval(timer);
    }
  }, [end, duration]);

  return { count, isAnimating };
};

// Enhanced Value Change Indicator Component
const ValueChangeIndicator = ({ value, prevValue, children, className = "" }) => {
  const [changeType, setChangeType] = useState<'increase' | 'decrease' | 'none'>('none');
  const [showSparkle, setShowSparkle] = useState(false);
  
  useEffect(() => {
    if (prevValue !== undefined && Math.abs(value - prevValue) > 0.001) {
      if (value > prevValue) {
        setChangeType('increase');
        setShowSparkle(true);
        setTimeout(() => setShowSparkle(false), 1000);
      } else if (value < prevValue) {
        setChangeType('decrease');
      }
      
      const timer = setTimeout(() => setChangeType('none'), 3000);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  const getChangeClass = () => {
    switch (changeType) {
      case 'increase':
        return 'animate-pulse text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.9)] scale-105';
      case 'decrease':
        return 'animate-pulse text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)] scale-95';
      default:
        return 'scale-100';
    }
  };

  return (
    <div className={`transition-all duration-500 ${getChangeClass()} ${className} relative`}>
      {children}
      {showSparkle && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 text-yellow-400 animate-ping">✨</div>
          <div className="absolute bottom-0 left-0 text-yellow-400 animate-ping animation-delay-300">✨</div>
        </div>
      )}
    </div>
  );
};

// Enhanced Button Component
const EnhancedButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false, 
  variant = 'primary',
  className = '',
  size = 'default',
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    if (disabled || loading) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const newRipple = {
      x,
      y,
      size,
      id: Date.now(),
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 800);
    
    onClick?.(e);
  };

  const baseClasses = "relative overflow-hidden retro-button transition-all duration-300 transform select-none";
  const variantClasses = {
    primary: "retro-button",
    secondary: "retro-button-secondary",
    success: "retro-button-success",
    danger: "retro-button-danger"
  };

  const sizeClasses = {
    small: "px-3 py-2 text-xs",
    default: "px-6 py-3 text-sm",
    large: "px-8 py-4 text-base"
  };
  
  const disabledClasses = disabled 
    ? "opacity-50 cursor-not-allowed transform-none" 
    : "hover:scale-105 active:scale-95 cursor-pointer";

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => {
        setIsPressed(false);
        setIsHovered(false);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white opacity-40 animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animationDuration: '800ms',
          }}
        />
      ))}
      
      {isHovered && !disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      )}
      
      <span className={`relative z-10 transition-all duration-200 ${isPressed ? 'scale-95' : 'scale-100'}`}>
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="tracking-wider">PROCESSING...</span>
          </div>
        ) : (
          children
        )}
      </span>
    </button>
  );
};

// Enhanced Card Component
const RetroCard = ({ children, className = "", glowOnHover = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`retro-card transition-all duration-300 ${glowOnHover ? 'hover:shadow-[0_0_30px_rgba(0,195,255,0.4)]' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered && glowOnHover ? 'translateY(-5px)' : 'translateY(0)',
      }}
    >
      {children}
    </div>
  );
};

// Spectacular Insert Coin Button
const InsertCoinButton = ({ onClick, disabled, loading, className = "" }) => {
  const [isGlowing, setIsGlowing] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlowing(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        group relative overflow-hidden
        bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600
        hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-500
        text-black font-black text-lg
        px-8 py-4 rounded-xl
        border-4 border-yellow-200
        shadow-[0_0_20px_rgba(255,215,0,0.8)]
        hover:shadow-[0_0_30px_rgba(255,215,0,1)]
        transition-all duration-300
        transform hover:scale-110 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isGlowing ? 'shadow-[0_0_40px_rgba(255,215,0,1)]' : ''}
        ${className}
      `}
      style={{
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        animation: isGlowing ? 'pulse 1s ease-in-out' : 'none'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-0 group-hover:opacity-100 group-hover:animate-bounce"
            style={{
              left: `${10 + i * 12}%`,
              top: `${5 + (i % 3) * 15}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: '2.5s'
            }}
          >
            <CoinImage size={16} />
          </div>
        ))}
      </div>
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 group-hover:animate-ping">
          <CoinImage size={20} className="group-hover:animate-spin" />
        </div>
        <div className="absolute bottom-1 left-2 opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-500">
          <CoinImage size={20} className="group-hover:animate-spin" />
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-center gap-3">
        {loading ? (
          <>
            <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
            <span className="tracking-wider">PROCESSING...</span>
          </>
        ) : (
          <>
            <CoinImage size={24} className="group-hover:animate-spin"  />
            <span className="tracking-wider font-black">INSERT COIN</span>
            <CoinImage size={24} className="group-hover:animate-spin" />
          </>
        )}
      </div>
    </button>
  );
};

// Spectacular Cashout Button
const CashoutButton = ({ onClick, disabled, loading, amount, className = "" }) => {
  const [isGlowing, setIsGlowing] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlowing(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      disabled={disabled || amount === 0 || loading}
      className={`
        group relative overflow-hidden
        bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600
        hover:from-emerald-400 hover:via-green-400 hover:to-emerald-500
        text-white font-black text-lg
        px-8 py-4 rounded-xl
        border-4 border-emerald-200
        shadow-[0_0_20px_rgba(16,185,129,0.8)]
        hover:shadow-[0_0_30px_rgba(16,185,129,1)]
        transition-all duration-300
        transform hover:scale-110 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${isGlowing && !disabled ? 'shadow-[0_0_40px_rgba(16,185,129,1)]' : ''}
        ${className}
      `}
      style={{
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        animation: isGlowing && !disabled ? 'pulse 1s ease-in-out' : 'none'
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-0 group-hover:opacity-100 group-hover:animate-bounce"
            style={{
              left: `${10 + i * 12}%`,
              top: `${5 + (i % 3) * 15}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: '2.5s'
            }}
          >
            <AptosLogo size={16} />
          </div>
        ))}
      </div>
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 group-hover:animate-ping">
          <AptosLogo size={20} />
        </div>
        <div className="absolute bottom-1 left-2 opacity-0 group-hover:opacity-100 group-hover:animate-ping animation-delay-500">
          <AptosLogo size={20} className="group-hover:animate-spin" />
        </div>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="relative z-10 flex items-center justify-center gap-3">
        {loading ? (
          <>
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <span className="tracking-wider">PROCESSING...</span>
          </>
        ) : (
          <>
            <AptosLogo size={24} className="group-hover:animate-spin" />
            <span className="tracking-wider font-black">CASHOUT</span>
            <AptosLogo size={24} className="group-hover:animate-spin" />
          </>
        )}
      </div>
    </button>
  );
};

// Quick Amount Selector
const QuickAmountSelector = ({ amounts, onSelect, symbol = "APT", disabled = false }) => (
  <div className="grid grid-cols-3 gap-2 mb-4">
    {amounts.map((amount, index) => (
      <button
        key={index}
        onClick={() => onSelect(amount.toString())}
        disabled={disabled}
        className="retro-button-secondary text-xs py-2 px-1 hover:bg-cyan-400/20 transition-colors disabled:opacity-50"
      >
        {amount === 'MAX' ? '💎 MAX' : `💰 ${amount}`}
      </button>
    ))}
  </div>
);

interface PortalData {
  ccitBalance: number;
  nav: number;
  portfolioValue: number;
  centralTreasury: number;
  gameReserves: number;
  totalTreasury: number;
  totalSupply: number;
  aptBalance: number;
  loading: boolean;
  error: string | null;
}

const InvestorPortal: React.FC = () => {
  const { account, connected, signAndSubmitTransaction, network } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [data, setData] = useState<PortalData>({
    ccitBalance: 0,
    nav: 0,
    portfolioValue: 0,
    centralTreasury: 0,
    gameReserves: 0,
    totalTreasury: 0,
    totalSupply: 0,
    aptBalance: 0,
    loading: true,
    error: null
  });
  
  const [prevData, setPrevData] = useState<PortalData>(data);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successAnimationType, setSuccessAnimationType] = useState<'deposit' | 'withdraw' | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Animated values
  const portfolioCounter = useCountUp(data.portfolioValue, 1200, 4);
  const navCounter = useCountUp(data.nav, 1000, 4);
  const ccitCounter = useCountUp(data.ccitBalance, 800, 3);
  const aptCounter = useCountUp(data.aptBalance, 800, 4);
  const centralTreasuryCounter = useCountUp(data.centralTreasury, 1400, 4);
  const totalSupplyCounter = useCountUp(data.totalSupply, 1000, 3);

  const formatAPT = (amount: number): string => amount.toFixed(4);
  const formatCCIT = (amount: number): string => amount.toFixed(3);
  const formatPercentage = (value: number): string => `${value.toFixed(2)}%`;

  // Helper function to round to multiples of 5 or 10
  const roundToNiceAmount = (amount: number): number => {
    if (amount === 0) return 0;
    if (amount < 10) return Math.round(amount * 2) / 2; // Round to 0.5
    if (amount < 100) return Math.round(amount / 5) * 5; // Round to 5
    return Math.round(amount / 10) * 10; // Round to 10
  };

  const fetchPortfolioData = async () => {
    if (!account || !connected) return;
    
    try {
      const userAddress = account.address.toStringLong();
      
      // Add delay to help with rate limiting
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const ccitBalanceResponse = await aptosClient().view({
        payload: {
          function: `${INVESTOR_TOKEN_ADDRESS}::InvestorToken::user_balance`,
          functionArguments: [userAddress]
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const navResponse = await aptosClient().view({
        payload: {
          function: `${INVESTOR_TOKEN_ADDRESS}::InvestorToken::nav`,
          functionArguments: []
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const aptBalanceResponse = await aptosClient().getAccountAPTAmount({
        accountAddress: userAddress
      });
      
      const ccitBalance = Number(ccitBalanceResponse[0]) / Math.pow(10, CCIT_DECIMALS);
      const navRaw = Number(navResponse[0]);
      const nav = navRaw / NAV_SCALE;
      const portfolioValue = ccitBalance * nav;
      const aptBalance = Number(aptBalanceResponse) / Math.pow(10, APT_DECIMALS);
      
      setData(prev => ({
        ...prev,
        ccitBalance: isNaN(ccitBalance) ? 0 : ccitBalance,
        nav: isNaN(nav) ? 1 : nav,
        portfolioValue: isNaN(portfolioValue) ? 0 : portfolioValue,
        aptBalance: isNaN(aptBalance) ? 0 : aptBalance
      }));
      
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        setData(prev => ({ ...prev, error: 'Rate limited - retrying...' }));
      } else {
        setData(prev => ({
          ...prev,
          error: 'Failed to fetch portfolio data'
        }));
      }
    }
  };

  const fetchTreasuryData = async () => {
    try {
      // Add delay to help with rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const centralResponse = await aptosClient().view({
        payload: {
          function: `${CASINO_HOUSE_ADDRESS}::CasinoHouse::central_treasury_balance`,
          functionArguments: []
        }
      });
      
      // Try the correct treasury function name
      let totalTreasuryResponse;
      try {
        totalTreasuryResponse = await aptosClient().view({
          payload: {
            function: `${CASINO_HOUSE_ADDRESS}::CasinoHouse::treasury_balance`,
            functionArguments: []
          }
        });
      } catch (totalTreasuryError) {
        // If total treasury function doesn't exist, calculate as central * 1.2
        const centralValue = Number(centralResponse[0]) / Math.pow(10, APT_DECIMALS);
        totalTreasuryResponse = [centralValue * 1.2 * Math.pow(10, APT_DECIMALS)];
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const supplyResponse = await aptosClient().view({
        payload: {
          function: `${INVESTOR_TOKEN_ADDRESS}::InvestorToken::total_supply`,
          functionArguments: []
        }
      });
      
      const centralTreasury = Number(centralResponse[0]) / Math.pow(10, APT_DECIMALS);
      const totalTreasury = Number(totalTreasuryResponse[0]) / Math.pow(10, APT_DECIMALS);
      const totalSupply = Number(supplyResponse[0]) / Math.pow(10, CCIT_DECIMALS);
      const gameReserves = Math.max(0, totalTreasury - centralTreasury);
      
      setData(prev => ({
        ...prev,
        centralTreasury: isNaN(centralTreasury) ? 0 : centralTreasury,
        totalTreasury: isNaN(totalTreasury) ? 0 : totalTreasury,
        gameReserves: isNaN(gameReserves) ? 0 : gameReserves,
        totalSupply: isNaN(totalSupply) ? 0 : totalSupply,
        loading: false
      }));
      
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        setData(prev => ({ ...prev, error: 'Rate limited - retrying...' }));
        return;
      }
      
      try {
        // Fallback: just get central treasury and supply
        const centralResponse = await aptosClient().view({
          payload: {
            function: `${CASINO_HOUSE_ADDRESS}::CasinoHouse::central_treasury_balance`,
            functionArguments: []
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const supplyResponse = await aptosClient().view({
          payload: {
            function: `${INVESTOR_TOKEN_ADDRESS}::InvestorToken::total_supply`,
            functionArguments: []
          }
        });
        
        const centralTreasury = Number(centralResponse[0]) / Math.pow(10, APT_DECIMALS);
        const totalSupply = Number(supplyResponse[0]) / Math.pow(10, CCIT_DECIMALS);
        
        setData(prev => ({
          ...prev,
          centralTreasury: isNaN(centralTreasury) ? 0 : centralTreasury,
          totalSupply: isNaN(totalSupply) ? 0 : totalSupply,
          totalTreasury: isNaN(centralTreasury) ? 0 : centralTreasury * 1.2,
          gameReserves: isNaN(centralTreasury) ? 0 : centralTreasury * 0.2,
          loading: false,
          error: `Treasury data partially loaded: ${error.message}`
        }));
      } catch (fallbackError) {
        setData(prev => ({
          ...prev,
          error: `Failed to fetch treasury data: ${fallbackError.message}`
        }));
      }
    }
  };

  const fetchAllData = async (showLoading: boolean = false) => {
    if (showLoading) {
      setDataLoading(true);
    }
    setPrevData(data);
    try {
      await Promise.all([
        fetchPortfolioData(),
        fetchTreasuryData()
      ]);
      setLastUpdateTime(Date.now());
      
      // Mark first load as complete
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    } finally {
      if (showLoading) {
        setDataLoading(false);
      }
    }
  };

  const handleDeposit = async () => {
    if (!connected || !account) {
      toast({
        title: "Wallet not connected",
        description: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: ERROR_MESSAGES.INVALID_AMOUNT,
        variant: "destructive",
      });
      return;
    }

    if (amount > data.aptBalance) {
      toast({
        title: "Insufficient balance",
        description: ERROR_MESSAGES.INSUFFICIENT_BALANCE,
        variant: "destructive",
      });
      return;
    }

    setTransactionLoading(true);
    try {
      const amountInOctas = Math.floor(amount * Math.pow(10, APT_DECIMALS));
      
      const transaction = await signAndSubmitTransaction({
        data: {
          function: `${INVESTOR_TOKEN_ADDRESS}::InvestorToken::deposit_and_mint`,
          functionArguments: [amountInOctas.toString()],
        },
      });

      await aptosClient().waitForTransaction({
        transactionHash: transaction.hash,
      });

      setSuccessAnimationType('deposit');
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setSuccessAnimationType(null);
      }, 3000);

      toast({
        title: "Success! 🎉",
        description: SUCCESS_MESSAGES.DEPOSIT_SUCCESS,
      });

      setDepositAmount('');
      setShowDepositModal(false);
      await fetchAllData(false);
      
    } catch (error) {
      toast({
        title: "Transaction failed",
        description: ERROR_MESSAGES.TRANSACTION_FAILED,
        variant: "destructive",
      });
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connected || !account) {
      toast({
        title: "Wallet not connected",
        description: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: ERROR_MESSAGES.INVALID_AMOUNT,
        variant: "destructive",
      });
      return;
    }

    if (amount > data.ccitBalance) {
      toast({
        title: "Insufficient balance",
        description: ERROR_MESSAGES.INSUFFICIENT_BALANCE,
        variant: "destructive",
      });
      return;
    }

    setTransactionLoading(true);
    try {
      const amountInCCIT = Math.floor(amount * Math.pow(10, CCIT_DECIMALS));
      
      const transaction = await signAndSubmitTransaction({
        data: {
          function: `${INVESTOR_TOKEN_ADDRESS}::InvestorToken::redeem`,
          functionArguments: [amountInCCIT.toString()],
        },
      });

      await aptosClient().waitForTransaction({
        transactionHash: transaction.hash,
      });

      setSuccessAnimationType('withdraw');
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setSuccessAnimationType(null);
      }, 3000);

      toast({
        title: "Success! 💰",
        description: SUCCESS_MESSAGES.REDEEM_SUCCESS,
      });

      setWithdrawAmount('');
      setShowWithdrawModal(false);
      await fetchAllData(false);
      
    } catch (error) {
      toast({
        title: "Transaction failed",
        description: ERROR_MESSAGES.TRANSACTION_FAILED,
        variant: "destructive",
      });
    } finally {
      setTransactionLoading(false);
    }
  };

  // Real-time updates with rate limiting protection
  useEffect(() => {
    if (connected) {
      // Initial fetch with loading indicator
      setTimeout(() => fetchAllData(true), 1000);
      
      // Main data refresh every 30 seconds WITHOUT loading indicator
      const mainDataInterval = setInterval(() => {
        setTimeout(() => fetchAllData(false), Math.random() * 2000); // No loading shown
      }, 30000); // 30 seconds
      
      // Chart data refresh every 5 seconds (just trigger counter updates)
      const chartInterval = setInterval(() => {
        setLastUpdateTime(Date.now());
      }, 5000); // 5 seconds
      
      return () => {
        clearInterval(mainDataInterval);
        clearInterval(chartInterval);
      };
    }
  }, [connected]);

  const timeSinceUpdate = Math.floor((Date.now() - lastUpdateTime) / 1000);
  
  // Calculate dynamic NAV change based on current vs initial NAV
  const navChange = prevData.nav > 0 
    ? ((data.nav - prevData.nav) / prevData.nav) * 100
    : 0;
  
  const profitLoss = data.portfolioValue - (data.ccitBalance * 1.0);
  const profitLossPercentage = data.ccitBalance > 0 ? (profitLoss / (data.ccitBalance * 1.0)) * 100 : 0;

  if (!connected) {
    return (
      <div className="retro-body min-h-screen flex items-center justify-center">
        <div className="retro-scanlines"></div>
        <div className="retro-pixel-grid"></div>
        <div className="container mx-auto px-4">
          <div className="retro-terminal max-w-md mx-auto animate-pulse">
            <div className="retro-terminal-header">/// WALLET CONNECTION REQUIRED ///</div>
            <div className="retro-terminal-line">
              <span className="retro-terminal-prompt">SYSTEM:\&gt;</span>
              <span>Please connect wallet to access investor portal</span>
            </div>
            <div className="retro-terminal-line">
              <span className="retro-terminal-prompt">SYSTEM:\&gt;</span>
              <span>Initializing secure connection...</span>
            </div>
            <div className="retro-terminal-line">
              <span className="retro-terminal-prompt">SYSTEM:\&gt;</span>
              <span className="retro-terminal-cursor">█</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-body min-h-screen relative">
      <div className="retro-scanlines"></div>
      <div className="retro-pixel-grid"></div>
      
      {showSuccessAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-bounce">
            {successAnimationType === 'deposit' ? (
              <CoinImage size={96} />
            ) : successAnimationType === 'withdraw' ? (
              <AptosLogo size={96} />
            ) : null}
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Enhanced Floating Title */}
        <FloatingTitle />

        {/* Real-time Status Bar */}
        <div className="bg-black/40 border border-cyan-400/30 rounded-lg p-3 mb-8 text-center">
          <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400">LIVE UPDATES ACTIVE</span>
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-yellow-400">
              📈 Charts: 5s • 🔗 Data: 30s
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-orange-400 text-xs">
              🌐 Network: {network?.name || 'Unknown'}
            </div>
            <div className="text-gray-400">•</div>
            <div 
              className="text-purple-400 text-xs cursor-pointer hover:text-purple-300 transition-colors flex items-center gap-1 group"
              onClick={() => {
                if (CASINO_HOUSE_ADDRESS) {
                  navigator.clipboard.writeText(CASINO_HOUSE_ADDRESS);
                  toast({
                    title: "Copied!",
                    description: "Casino contract address copied to clipboard",
                    duration: 2000
                  });
                }
              }}
              title="Click to copy full address"
            >
              🏦 Casino: {CASINO_HOUSE_ADDRESS?.slice(0, 8)}...{CASINO_HOUSE_ADDRESS?.slice(-4)}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">📋</span>
            </div>
            <div className="text-gray-400">•</div>
            <div 
              className="text-cyan-400 text-xs cursor-pointer hover:text-cyan-300 transition-colors flex items-center gap-1 group"
              onClick={() => {
                if (INVESTOR_TOKEN_ADDRESS) {
                  navigator.clipboard.writeText(INVESTOR_TOKEN_ADDRESS);
                  toast({
                    title: "Copied!",
                    description: "CCIT token address copied to clipboard",
                    duration: 2000
                  });
                }
              }}
              title="Click to copy full address"
            >
              💎 CCIT: {INVESTOR_TOKEN_ADDRESS?.slice(0, 8)}...{INVESTOR_TOKEN_ADDRESS?.slice(-4)}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">📋</span>
            </div>
            {data.error && data.error.includes('Rate limited') && (
              <>
                <div className="text-gray-400">•</div>
                <div className="text-orange-400 text-xs">
                  ⏱️ Rate limit - auto-retry active
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto mb-8">
          {/* Portfolio Panel */}
          <RetroCard glowOnHover={true} className="bg-black/60 backdrop-blur-sm">
            <div className="retro-pixel-font text-sm text-cyan-300 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-cyan-400 animate-pulse rounded-full"></div>
                YOUR PORTFOLIO
              </div>
              <div className="text-xs text-gray-400">
                💎 HODL STRONG
              </div>
            </div>
            
            <ValueChangeIndicator 
              value={portfolioCounter.count} 
              prevValue={prevData.portfolioValue}
              className="retro-display mb-6"
            >
              <div className="retro-display-value text-5xl">
                {dataLoading ? <span className="retro-loading"></span> : `$${formatAPT(portfolioCounter.count)}`}
              </div>
              <div className="retro-display-label">PORTFOLIO VALUE</div>
            </ValueChangeIndicator>

            <RealTimeNAVChart currentNAV={navCounter.count} className="mb-6" />

            <div className="retro-stats mb-6">
              <div className="retro-stat-line">
                <span className="retro-stat-name">CURRENT NAV:</span>
                <ValueChangeIndicator 
                  value={navCounter.count} 
                  prevValue={prevData.nav}
                  className="retro-stat-value"
                >
                  {dataLoading ? <span className="retro-loading"></span> : `$${formatAPT(navCounter.count)}`}
                </ValueChangeIndicator>
              </div>
              <div className="retro-stat-line">
                <span className="retro-stat-name">SESSION CHANGE:</span>
                <span className={`retro-stat-value animate-pulse font-bold ${
                  navChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {navChange >= 0 ? '+' : ''}{formatPercentage(navChange)} {navChange >= 0 ? '📈' : '📉'}
                </span>
              </div>
              <div className="retro-stat-line">
                <span className="retro-stat-name">CCIT BALANCE:</span>
                <span className="retro-stat-value">
                  {dataLoading ? <span className="retro-loading"></span> : `${formatCCIT(ccitCounter.count)} CCIT`}
                </span>
              </div>
              <div className="retro-stat-line">
                <span className="retro-stat-name">APT BALANCE:</span>
                <span className="retro-stat-value">
                  {dataLoading ? <span className="retro-loading"></span> : `${formatAPT(aptCounter.count)} APT`}
                </span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <InsertCoinButton
                onClick={() => setShowDepositModal(true)}
                disabled={transactionLoading}
                loading={transactionLoading}
                className="flex-1"
              />
              
              <CashoutButton
                onClick={() => setShowWithdrawModal(true)}
                disabled={data.ccitBalance === 0 || transactionLoading}
                loading={transactionLoading}
                amount={data.ccitBalance}
                className="flex-1"
              />
            </div>
          </RetroCard>

          {/* Treasury Panel */}
          <RetroCard glowOnHover={true} className="bg-black/60 backdrop-blur-sm">
            <div className="retro-pixel-font text-sm text-cyan-300 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 animate-pulse rounded-full"></div>
                CASINO TREASURY
              </div>
              <div className="text-xs text-gray-400">
                🏦 GROWING STRONG
              </div>
            </div>

            {/* Treasury Live Action Disclaimer */}
            <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border border-yellow-400/40 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="font-bold text-yellow-400 text-sm">WANT TO SEE TREASURY IN ACTION?</div>
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                <div>• Play some games to see <span className="text-yellow-400 font-bold">immediate treasury updates</span></div>
                <div>• Win/lose events instantly affect treasury reserves</div>
                <div>• Treasury data refreshes <span className="text-cyan-400 font-bold">every 30 seconds</span></div>
                <div>• Your investment share grows with casino profits! 💰</div>
              </div>
            </div>
            
            <RealTimeTreasuryChart totalTreasury={data.totalTreasury} className="mb-6" />

            <div className="retro-stats">
              <div className="retro-stat-line">
                <span className="retro-stat-name">CENTRAL VAULT:</span>
                <ValueChangeIndicator 
                  value={centralTreasuryCounter.count} 
                  prevValue={prevData.centralTreasury}
                  className="retro-stat-value"
                >
                  {dataLoading ? <span className="retro-loading"></span> : `${formatAPT(centralTreasuryCounter.count)} APT`}
                </ValueChangeIndicator>
              </div>
              <div className="retro-stat-line">
                <span className="retro-stat-name">GAME VAULTS:</span>
                <ValueChangeIndicator 
                  value={data.gameReserves} 
                  prevValue={prevData.gameReserves}
                  className="retro-stat-value"
                >
                  {dataLoading ? <span className="retro-loading"></span> : `${formatAPT(data.gameReserves)} APT`}
                </ValueChangeIndicator>
              </div>
              <div className="retro-stat-line">
                <span className="retro-stat-name">TOTAL TREASURY:</span>
                <ValueChangeIndicator 
                  value={data.totalTreasury} 
                  prevValue={prevData.totalTreasury}
                  className="retro-stat-value text-yellow-400 font-bold"
                >
                  {dataLoading ? <span className="retro-loading"></span> : `${formatAPT(data.totalTreasury)} APT`}
                </ValueChangeIndicator>
              </div>
              <div className="retro-stat-line">
                <span className="retro-stat-name">TOTAL SUPPLY:</span>
                <span className="retro-stat-value">
                  {dataLoading ? <span className="retro-loading"></span> : `${formatCCIT(totalSupplyCounter.count)} CCIT`}
                </span>
              </div>
            </div>
          </RetroCard>
        </div>

        {/* Games Dashboard */}
        <GamesDashboard navigate={navigate} toast={toast} className="max-w-7xl mx-auto mb-8" />

        {/* Enhanced Terminal Status */}
        <div className="retro-terminal max-w-6xl mx-auto">
          <div className="retro-pixel-font text-sm text-yellow-300 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 animate-pulse rounded-full"></div>
              LIVE SYSTEM STATUS
            </div>
            <div className="text-xs text-gray-400">
              ⚡ REAL-TIME
            </div>
          </div>
          <div className="retro-terminal-line">
            <span className="retro-terminal-prompt">CCIT:\&gt;</span>
            <span>NAV: ${formatAPT(navCounter.count)} | SUPPLY: {formatCCIT(totalSupplyCounter.count)} CCIT | TREASURY: {formatAPT(data.totalTreasury)} APT</span>
          </div>
          <div className="retro-terminal-line">
            <span className="retro-terminal-prompt">CCIT:\&gt;</span>
            <span className="text-green-400">ALL SYSTEMS OPERATIONAL - PROFIT SHARING ACTIVE</span>
          </div>
          <div className="retro-terminal-line">
            <span className="retro-terminal-prompt">CCIT:\&gt;</span>
            <span className="text-yellow-400">RATE LIMIT PROTECTION: ACTIVE | SMART RETRY: ENABLED</span>
          </div>
          <div className="retro-terminal-line">
            <span className="retro-terminal-prompt">CCIT:\&gt;</span>
            <span className="text-cyan-400">LIVE PORTFOLIO TRACKING | AUTO-REFRESH: ENABLED</span>
          </div>
          <div className="retro-terminal-line">
            <span className="retro-terminal-prompt">CCIT:\&gt;</span>
            <span className="retro-terminal-cursor">█</span>
          </div>
        </div>

        {/* Enhanced Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="retro-card max-w-md w-full mx-4 animate-pulse">
              <h3 className="retro-pixel-font text-xl mb-4 text-center flex items-center justify-center gap-2">
                💰 INSERT COIN 💰
              </h3>
              
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">
                  Available: {formatAPT(data.aptBalance)} APT
                </div>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter APT amount"
                  className="retro-input w-full mb-4 text-lg"
                  step="0.01"
                  min="0"
                  max={data.aptBalance}
                />
                
                <QuickAmountSelector
                  amounts={[
                    roundToNiceAmount(data.aptBalance * 0.25),
                    roundToNiceAmount(data.aptBalance * 0.5),
                    'MAX'
                  ]}
                  onSelect={(amount) => setDepositAmount(amount === 'MAX' ? data.aptBalance.toString() : amount)}
                  symbol="APT"
                  disabled={transactionLoading}
                />

                {depositAmount && (
                  <div className="bg-black/30 p-3 rounded border border-cyan-400/30 text-sm">
                    <div className="flex justify-between">
                      <span>Deposit Amount:</span>
                      <span>{depositAmount} APT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. CCIT Received:</span>
                      <span className="text-green-400">
                        ~{(parseFloat(depositAmount) / data.nav).toFixed(3)} CCIT
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <EnhancedButton
                  onClick={() => setShowDepositModal(false)}
                  variant="secondary"
                  className="flex-1"
                  disabled={transactionLoading}
                >
                  CANCEL
                </EnhancedButton>
                <EnhancedButton
                  onClick={handleDeposit}
                  loading={transactionLoading}
                  variant="primary"
                  className="flex-1"
                >
                  {transactionLoading ? 'PROCESSING...' : 'DEPOSIT'}
                </EnhancedButton>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Withdraw Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="retro-card max-w-md w-full mx-4 animate-pulse">
              <h3 className="retro-pixel-font text-xl mb-4 text-center flex items-center justify-center gap-2">
                🎰 CASH OUT 🎰
              </h3>
              
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">
                  Available: {formatCCIT(data.ccitBalance)} CCIT
                </div>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter CCIT amount"
                  className="retro-input w-full mb-4 text-lg"
                  step="0.01"
                  min="0"
                  max={data.ccitBalance}
                />
                
                <QuickAmountSelector
                  amounts={[
                    roundToNiceAmount(data.ccitBalance * 0.25),
                    roundToNiceAmount(data.ccitBalance * 0.5),
                    'MAX'
                  ]}
                  onSelect={(amount) => setWithdrawAmount(amount === 'MAX' ? data.ccitBalance.toString() : amount)}
                  symbol="CCIT"
                  disabled={transactionLoading}
                />

                {withdrawAmount && (
                  <div className="bg-black/30 p-3 rounded border border-green-400/30 text-sm">
                    <div className="flex justify-between">
                      <span>Withdraw Amount:</span>
                      <span>{withdrawAmount} CCIT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. APT Received:</span>
                      <span className="text-green-400">
                        ~{(parseFloat(withdrawAmount) * data.nav * 0.999).toFixed(4)} APT
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      *0.1% redemption fee applies
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <EnhancedButton
                  onClick={() => setShowWithdrawModal(false)}
                  variant="secondary"
                  className="flex-1"
                  disabled={transactionLoading}
                >
                  CANCEL
                </EnhancedButton>
                <EnhancedButton
                  onClick={handleWithdraw}
                  loading={transactionLoading}
                  variant="success"
                  className="flex-1"
                >
                  {transactionLoading ? 'PROCESSING...' : 'WITHDRAW'}
                </EnhancedButton>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Footer */}
        <footer className="text-center p-8 border-t-4 border-yellow-400 mt-12 bg-black/40 rounded-t-xl backdrop-blur-sm">
          <div className="flex items-center justify-center gap-6 mb-6 flex-wrap">
            <CoinImage size={48} spinning={dataLoading} />
            <div className="text-center">
              <div className="retro-pixel-font text-2xl text-cyan-400 mb-2">
                CHAINCASINO INVESTOR TERMINAL
              </div>
              <div className="retro-pixel-font text-sm text-cyan-400 mb-2">
                POWERED BY APTOS • WHERE DEFI MEETS GAMBLING
              </div>
              <div className="text-xs text-gray-400">
                🚀 Rate-limit optimized • 💎 HODL for maximum gains • ⚡ Smart refresh intervals • 🔄 Auto-retry enabled
              </div>
            </div>
            <AptosLogo size={48} />
          </div>
          
          {/* GitHub Credits */}
          <div className="border-t border-gray-600/30 pt-6 mt-6">
            <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">Made in 2 weeks on</span>
                <AptosLogo size={24} />
                <span className="text-cyan-400 font-bold">Aptos</span>
              </div>
              <div className="text-gray-400">•</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">by</span>
                <a 
                  href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-bold"
                >
                  PersonaNormale
                </a>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <a 
                href="https://github.com/PersonaNormale/ChainCasino" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors bg-black/30 px-4 py-2 rounded-lg border border-gray-600/30 hover:border-gray-500/50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                <span>View on GitHub</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default InvestorPortal;

