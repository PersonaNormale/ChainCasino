import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as THREE from 'three';
import { 
  GAMES_ADDRESS,
  formatAPT,
  SEVEN_OUT_MIN_BET,
  SEVEN_OUT_MAX_BET
} from '@/constants/chaincasino';
import { aptosClient } from '@/utils/aptosClient';
import { 
  playSevenOut,
  clearGameResult,
  getViewFunctions,
  parseGameResult,
  parseGameConfig,
  GameResult,
  GameConfig 
} from '@/entry-functions/chaincasino';

// Add CSS for pixelated images
const pixelatedStyle = `
  .pixelated {
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
`;


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
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const nextSibling = target.nextSibling as HTMLElement;
        if (nextSibling) {
          nextSibling.style.display = 'flex';
        }
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

// Enhanced RetroCard component matching GameHub/InvestorPortal patterns
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

// 3D Dice Rolling Component
const DiceRoll3D = ({ die1, die2, isRolling = false }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const dice1Ref = useRef(null);
  const dice2Ref = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 350 / 150, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(350, 150);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Improved lighting for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight1.position.set(3, 3, 3);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-3, 3, -3);
    scene.add(ambientLight, directionalLight1, directionalLight2);

    // Create flashy dice
    const createDie = (value, position) => {
      const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      geometry.computeBoundingBox();
      
      const createFace = (number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Bright white base with subtle color
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 256, 256);
        
        // Add subtle color overlay
        const time = Date.now() * 0.001;
        const hue = (time * 30 + number * 45) % 360;
        const colorOverlay = context.createRadialGradient(128, 128, 50, 128, 128, 180);
        colorOverlay.addColorStop(0, `hsla(${hue}, 30%, 95%, 0.3)`);
        colorOverlay.addColorStop(1, `hsla(${hue}, 20%, 90%, 0.2)`);
        context.fillStyle = colorOverlay;
        context.fillRect(0, 0, 256, 256);
        
        // Clean border
        context.strokeStyle = '#333333';
        context.lineWidth = 3;
        context.strokeRect(6, 6, 244, 244);
        
        // Reset shadow for dots
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        
        // Neon glowing dots
        const dotSize = 18;
        const patterns = {
          1: [[128, 128]],
          2: [[80, 80], [176, 176]],
          3: [[64, 64], [128, 128], [192, 192]],
          4: [[80, 80], [176, 80], [80, 176], [176, 176]],
          5: [[64, 64], [192, 64], [128, 128], [64, 192], [192, 192]],
          6: [[64, 64], [192, 64], [64, 128], [192, 128], [64, 192], [192, 192]]
        };
        
        patterns[number].forEach(([x, y], index) => {
          // Dark dots that are clearly visible
          context.fillStyle = '#000000';
          context.beginPath();
          context.arc(x, y, dotSize, 0, Math.PI * 2);
          context.fill();
          
          // Small white highlight for 3D effect
          context.fillStyle = '#ffffff';
          context.beginPath();
          context.arc(x - dotSize * 0.3, y - dotSize * 0.3, dotSize * 0.25, 0, Math.PI * 2);
          context.fill();
        });
        
        return new THREE.CanvasTexture(canvas);
      };

      const materials = [
        new THREE.MeshLambertMaterial({ map: createFace(4), color: 0xffffff }),
        new THREE.MeshLambertMaterial({ map: createFace(3), color: 0xffffff }),
        new THREE.MeshLambertMaterial({ map: createFace(2), color: 0xffffff }),
        new THREE.MeshLambertMaterial({ map: createFace(5), color: 0xffffff }),
        new THREE.MeshLambertMaterial({ map: createFace(value), color: 0xffffff }),
        new THREE.MeshLambertMaterial({ map: createFace(7-value), color: 0xffffff })
      ];
      
      const die = new THREE.Mesh(geometry, materials);
      die.position.set(...position);
      die.castShadow = true;
      die.receiveShadow = true;
      
      return die;
    };

    const dice1 = createDie(die1, [-1, 0, 0]);
    const dice2 = createDie(die2, [1, 0, 0]);
    
    scene.add(dice1, dice2);
    
    dice1Ref.current = dice1;
    dice2Ref.current = dice2;
    sceneRef.current = scene;

    camera.position.set(0, 1, 3);
    camera.lookAt(0, 0, 0);

    // Smooth animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      if (isRolling) {
        dice1.rotation.x += 0.05;
        dice1.rotation.y += 0.08;
        dice2.rotation.x += 0.07;
        dice2.rotation.y += 0.06;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [die1, die2, isRolling]);

  return (
    <div className="flex justify-center">
      <div 
        ref={mountRef} 
        className="border border-purple-500/30 rounded-lg bg-gradient-to-br from-black/60 to-purple-900/20 backdrop-blur-sm"
        style={{ width: '350px', height: '150px' }}
      />
    </div>
  );
};

export const SevenOut: React.FC = () => {
  const { account, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();

  // Set page title and favicon
  useDocumentTitle({ 
    title: 'SevenOut - ChainCasino', 
    favicon: '/icons/seven-out.png' 
  });

  const [betAmount, setBetAmount] = useState('');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winStreak, setWinStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastSessionId, setLastSessionId] = useState(0);
  const [waitingForNewResult, setWaitingForNewResult] = useState(false);

  // Quick bet amounts relative to game config
  const getQuickBetAmounts = () => {
    if (!gameConfig) return [];
    const min = gameConfig.min_bet;
    const max = gameConfig.max_bet;
    return [
      { label: `${formatAPT(min)}`, value: min },
      { label: `${formatAPT(Math.floor(max * 0.125))}`, value: Math.floor(max * 0.125) },
      { label: `${formatAPT(Math.floor(max * 0.25))}`, value: Math.floor(max * 0.25) },
      { label: `${formatAPT(Math.floor(max * 0.5))}`, value: Math.floor(max * 0.5) },
      { label: `${formatAPT(max)}`, value: max },
    ];
  };

  useEffect(() => {
    if (account) {
      fetchGameConfig();
      checkExistingResult();
    }
  }, [account]);

  // Update win streak when game result changes
  useEffect(() => {
    if (gameResult) {
      if (gameResult.outcome === 1) { // Win
        const newStreak = winStreak + 1;
        setWinStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
      } else { // Loss or Push
        setWinStreak(0);
      }
    }
  }, [gameResult]);

  const fetchGameConfig = async () => {
    try {
      const config = await aptosClient().view({
        payload: {
          function: getViewFunctions().getGameConfig,
          functionArguments: []
        }
      });
      
      const [minBet, maxBet, payoutNum, payoutDen, houseEdge] = config as number[];
      setGameConfig({
        min_bet: minBet,
        max_bet: maxBet,
        payout_multiplier: payoutNum / payoutDen,
        house_edge_bps: houseEdge
      });
    } catch (error) {
      console.error('Failed to fetch game config:', error);
    }
  };

  const checkExistingResult = async () => {
    if (!account) return;
    
    try {
      const hasResult = await aptosClient().view({
        payload: {
          function: getViewFunctions().hasGameResult,
          functionArguments: [account.address.toString()]
        }
      });

      if (hasResult[0]) {
        const result = await aptosClient().view({
          payload: {
            function: getViewFunctions().getGameResult,
            functionArguments: [account.address.toString()]
          }
        });

        const [die1, die2, dice_sum, bet_type, bet_amount, payout, timestamp, session_id, outcome] = result as number[];
        
        const newResult = {
          die1,
          die2,
          dice_sum,
          bet_type,
          bet_amount,
          payout,
          timestamp,
          session_id,
          outcome
        };

        // If this is a new result (different session ID), stop rolling
        if (session_id !== lastSessionId) {
          setIsPlaying(false);
          setLastSessionId(session_id);
          setWaitingForNewResult(false);
        }
        
        setGameResult(newResult);
      }
    } catch (error) {
      console.error('Failed to check existing result:', error);
    }
  };

  const playGame = async (betOver: boolean) => {
    if (!account || !gameConfig) return;

    // Validate bet amount
    if (!betAmount || betAmount.trim() === '' || isNaN(parseFloat(betAmount))) {
      toast({
        title: "Invalid Bet Amount",
        description: "Please enter a valid bet amount",
        variant: "destructive"
      });
      return;
    }

    const betAmountOctas = Math.floor(parseFloat(betAmount) * 100000000);
    
    if (betAmountOctas < gameConfig.min_bet || betAmountOctas > gameConfig.max_bet) {
      toast({
        title: "Invalid Bet Amount",
        description: `Bet must be between ${formatAPT(gameConfig.min_bet)} and ${formatAPT(gameConfig.max_bet)} APT`,
        variant: "destructive"
      });
      return;
    }

    setIsPlaying(true);
    setIsLoading(true);
    setWaitingForNewResult(true);

    try {
      const transaction = playSevenOut({
        betOver,
        betAmount: betAmountOctas
      });
      
      const response = await signAndSubmitTransaction(transaction);
      await aptosClient().waitForTransaction({ transactionHash: response.hash });
      
      setTimeout(() => {
        checkExistingResult();
      }, 1000);
      
      // Removed obnoxious "Dice Rolled!" toast notification
    } catch (error) {
      console.error('Game play failed:', error);
      setWaitingForNewResult(false);
      toast({
        title: "Game Failed",
        description: error instanceof Error ? error.message : 'Transaction failed',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const clearTable = async () => {
    if (!account) return;
    
    setIsLoading(true);
    try {
      const transaction = clearGameResult();
      const response = await signAndSubmitTransaction(transaction);
      await aptosClient().waitForTransaction({ transactionHash: response.hash });
      
      setGameResult(null);
      // Removed obvious "Table Cleared" toast notification
    } catch (error) {
      console.error('Clear table failed:', error);
      toast({
        title: "Clear Failed",
        description: error instanceof Error ? error.message : 'Failed to clear table',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getOutcomeText = (outcome: number) => {
    switch (outcome) {
      case 0: return 'LOSE';
      case 1: return 'WIN';
      case 2: return 'PUSH';
      default: return 'UNKNOWN';
    }
  };

  const getOutcomeColor = (outcome: number) => {
    switch (outcome) {
      case 0: return 'text-red-400';
      case 1: return 'text-green-400';
      case 2: return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (!account) {
    return (
      <div className="retro-body min-h-screen relative">
        <style>{pixelatedStyle}</style>
        <div className="retro-scanlines"></div>
        <div className="retro-pixel-grid"></div>
        
        <div className="container mx-auto px-4 py-8 relative z-10 flex items-center justify-center min-h-screen">
          <div className="retro-terminal max-w-md mx-auto animate-pulse">
            <div className="retro-terminal-header">/// WALLET CONNECTION REQUIRED ///</div>
            <div className="retro-terminal-line">
              <span className="retro-terminal-prompt">SEVENOUT:\&gt;</span>
              <span>Please connect wallet to access dice table</span>
            </div>
            <div className="retro-terminal-line">
              <span className="retro-terminal-prompt">SEVENOUT:\&gt;</span>
              <span>Initializing secure connection...</span>
            </div>
            <div className="retro-terminal-line">
              <span className="retro-terminal-prompt">SEVENOUT:\&gt;</span>
              <span className="retro-terminal-cursor">█</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-body min-h-screen relative">
      <style>{pixelatedStyle}</style>
      <div className="retro-scanlines"></div>
      <div className="retro-pixel-grid"></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Enhanced Header */}
        <div className="text-center mb-8 relative">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="/dice-8bit-emoji.png" 
              alt="Dice" 
              className="w-16 h-16 pixelated animate-pulse"
            />
            <h1 className="text-6xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-yellow-400 bg-clip-text retro-pixel-font animate-pulse">
              SEVENOUT
            </h1>
            <img 
              src="/dice-8bit-emoji.png" 
              alt="Dice" 
              className="w-16 h-16 pixelated animate-pulse"
            />
          </div>
          
          {/* ChainCasino x Aptos Branding */}
          <div className="text-center mt-4 flex items-center justify-center gap-6 flex-wrap">
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
          
          <p className="text-cyan-400 text-xl retro-terminal-font mt-4">
            BET UP OR DOWN • 2.78% HOUSE EDGE • 1.933x PAYOUT
          </p>
        </div>

        {/* Real-time Status Bar */}
        <div className="bg-black/40 border border-cyan-400/30 rounded-lg p-3 mb-8 text-center">
          <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400">DICE TABLE ACTIVE</span>
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-yellow-400">
              🎲 Live Gaming
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Main Game Interface - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Betting Interface */}
            <RetroCard glowOnHover={true} className="bg-black/60 backdrop-blur-sm">
              <div className="retro-pixel-font text-base text-cyan-300 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-400 animate-pulse rounded-full"></div>
                  CHOOSE YOUR STAKES
                </div>
                <div className="text-sm text-gray-400">
                  PLACE BETS
                </div>
              </div>

              {/* Bet Amount Input */}
              <div className="space-y-4 mb-6">
                <label className="retro-terminal-font text-purple-300 font-bold flex items-center gap-2">
                  <AptosLogo size={20} />
                  Bet Amount (APT)
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  step="0.01"
                  min={gameConfig ? formatAPT(gameConfig.min_bet) : '0.02'}
                  max={gameConfig ? formatAPT(gameConfig.max_bet) : '0.4'}
                  className="retro-input w-full"
                  placeholder="Enter bet amount"
                />
                {gameConfig && (
                  <p className="text-xs text-gray-400 retro-terminal-font">
                    Min: {formatAPT(gameConfig.min_bet)} APT • Max: {formatAPT(gameConfig.max_bet)} APT
                  </p>
                )}
              </div>

              {/* Quick Bet Buttons */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                {getQuickBetAmounts().map(({ label, value }, index) => (
                  <button
                    key={label}
                    onClick={() => setBetAmount(formatAPT(value))}
                    className={`
                      relative overflow-hidden
                      ${index === 0 ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/30 border-2 border-cyan-400/50' : ''}
                      ${index === 1 ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 border-2 border-blue-400/50' : ''}
                      ${index === 2 ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/30 border-2 border-purple-400/50' : ''}
                      ${index === 3 ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 border-2 border-orange-400/50' : ''}
                      ${index === 4 ? 'bg-gradient-to-br from-red-500/20 to-red-600/30 border-2 border-red-400/50' : ''}
                      hover:scale-105 active:scale-95
                      transition-all duration-200
                      py-3 px-2 rounded-lg
                      text-white font-bold text-sm
                      retro-terminal-font
                      shadow-lg hover:shadow-xl
                      backdrop-blur-sm
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    `}
                    disabled={isLoading || isPlaying}
                  >
                    <div className="relative z-10">
                      <div className="text-xs opacity-75 mb-1">
                        {index === 0 ? 'MIN' : index === 4 ? 'MAX' : 'BET'}
                      </div>
                      <div className="text-sm font-bold">
                        {label} APT
                      </div>
                    </div>
                    
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity duration-200 bg-white rounded-lg"></div>
                  </button>
                ))}
              </div>

              {/* Main Betting Buttons */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <button
                  onClick={() => playGame(false)}
                  disabled={isLoading || isPlaying}
                  className="retro-button retro-button-danger h-24 text-xl"
                >
                  <div className="text-center">
                    <div className="retro-pixel-font text-xl">DOWN</div>
                  </div>
                </button>
                
                <button
                  onClick={() => playGame(true)}
                  disabled={isLoading || isPlaying}
                  className="retro-button retro-button-success h-24 text-xl"
                >
                  <div className="text-center">
                    <div className="retro-pixel-font text-xl">UP</div>
                  </div>
                </button>
              </div>

              {/* Game Rules */}
              <div className="retro-terminal bg-black/80">
                <div className="retro-terminal-header">/// GAME RULES ///</div>
                <div className="retro-terminal-line">
                  <span className="retro-terminal-prompt">RULE:\&gt;</span>
                  <span>Roll two dice (1-6 each)</span>
                </div>
                <div className="retro-terminal-line">
                  <span className="retro-terminal-prompt">RULE:\&gt;</span>
                  <span>Bet if sum will be UP or DOWN from 7</span>
                </div>
                <div className="retro-terminal-line">
                  <span className="retro-terminal-prompt">RULE:\&gt;</span>
                  <span>Exactly 7 = PUSH (bet returned)</span>
                </div>
                <div className="retro-terminal-line">
                  <span className="retro-terminal-prompt">RULE:\&gt;</span>
                  <span>Win pays 1.933x your bet</span>
                </div>
                <div className="retro-terminal-line">
                  <span className="retro-terminal-prompt">ODDS:\&gt;</span>
                  <span>15/36 ways to win each bet</span>
                </div>
              </div>
            </RetroCard>

            {/* Right Column - Game Result Display */}
            {gameResult ? (
              <RetroCard glowOnHover={true} className="bg-black/60 backdrop-blur-sm">
                <div className="retro-pixel-font text-base text-cyan-300 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-400 animate-pulse rounded-full"></div>
                    TABLE RESULTS
                  </div>
                  <div className="text-sm text-gray-400">
                    🎲 LAST ROLL
                  </div>
                </div>

                {/* Win Streak Counter */}
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-yellow-400/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="text-yellow-400 retro-pixel-font text-xs mb-1">WIN STREAK</div>
                      <div className={`text-2xl font-bold ${winStreak > 0 ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}>
                        {winStreak}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-400 retro-pixel-font text-xs mb-1">BEST STREAK</div>
                      <div className="text-2xl font-bold text-orange-400">
                        {bestStreak}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-400 retro-pixel-font text-xs mb-1">STATUS</div>
                      <div className={`text-lg font-bold ${winStreak >= 3 ? 'text-gold animate-bounce' : winStreak > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {winStreak >= 5 ? '🔥 HOT!' : winStreak >= 3 ? '⚡ ON FIRE' : winStreak > 0 ? '💰 WINNING' : '🎲 READY'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3D Dice Display */}
                <div className="mb-6">
                  <div className="text-center mb-4">
                                      <div className="retro-pixel-font text-base text-cyan-300 mb-4">
                    {(isPlaying || waitingForNewResult) ? 'ROLLING...' : '3D DICE ROLL'}
                  </div>
                  </div>
                  {(isPlaying || waitingForNewResult) ? (
                    <DiceRoll3D die1={1} die2={1} isRolling={true} />
                  ) : (
                    <DiceRoll3D die1={gameResult.die1} die2={gameResult.die2} isRolling={false} />
                  )}
                </div>
                
                <div className="text-center">
                  {(isPlaying || waitingForNewResult) ? (
                    <div className="flex justify-center items-center gap-4 mb-6">
                      <div className="retro-machine-screen text-6xl animate-pulse text-gray-500">
                        ?
                      </div>
                      <div className="text-2xl text-purple-400">+</div>
                      <div className="retro-machine-screen text-6xl animate-pulse text-gray-500">
                        ?
                      </div>
                      <div className="text-2xl text-purple-400">=</div>
                      <div className="retro-machine-screen text-6xl text-yellow-400 animate-pulse">
                        ?
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center gap-4 mb-6">
                      <div className="retro-machine-screen text-6xl">
                        {gameResult.die1}
                      </div>
                      <div className="text-2xl text-purple-400">+</div>
                      <div className="retro-machine-screen text-6xl">
                        {gameResult.die2}
                      </div>
                      <div className="text-2xl text-purple-400">=</div>
                      <div className="retro-machine-screen text-6xl text-yellow-400">
                        {gameResult.dice_sum}
                      </div>
                    </div>
                  )}
                  
                  <div className="retro-stats mb-6">
                    <div className="retro-stat-line">
                      <span className="retro-stat-name">BET TYPE:</span>
                      <span className="retro-stat-value">
                        {gameResult.bet_type === 1 ? 'UP' : 'DOWN'}
                      </span>
                    </div>
                    <div className="retro-stat-line">
                      <span className="retro-stat-name">OUTCOME:</span>
                      <span className={`retro-stat-value ${getOutcomeColor(gameResult.outcome)}`}>
                        {getOutcomeText(gameResult.outcome)}
                      </span>
                    </div>
                    <div className="retro-stat-line">
                      <span className="retro-stat-name">BET AMOUNT:</span>
                      <span className="retro-stat-value text-purple-400">
                        {formatAPT(gameResult.bet_amount)} APT
                      </span>
                    </div>
                    <div className="retro-stat-line">
                      <span className="retro-stat-name">PAYOUT:</span>
                      <span className="retro-stat-value text-green-400">
                        {formatAPT(gameResult.payout)} APT
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={clearTable}
                    disabled={isLoading}
                    className="retro-button retro-button-secondary"
                  >
                    {isLoading ? 'CLEARING...' : 'CLEAR TABLE'}
                  </button>
                </div>
              </RetroCard>
            ) : (
              <RetroCard className="bg-black/40 backdrop-blur-sm border-dashed border-gray-600">
                <div className="text-center py-20 text-gray-500">
                  <div className="text-6xl mb-4 opacity-50">🎲</div>
                  <div className="retro-pixel-font text-xl mb-4">NO ACTIVE GAME</div>
                  <div className="retro-terminal-font text-base">Place a bet to roll the dice</div>
                  
                  {/* Show streak even when no active game */}
                  {(winStreak > 0 || bestStreak > 0) && (
                    <div className="mt-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-gray-600 rounded-lg p-4">
                      <div className="flex justify-center gap-8 text-sm">
                        <div className="text-center">
                          <div className="text-gray-400 retro-pixel-font text-xs mb-1">CURRENT STREAK</div>
                          <div className="text-lg font-bold text-gray-300">{winStreak}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 retro-pixel-font text-xs mb-1">SESSION BEST</div>
                          <div className="text-lg font-bold text-orange-400">{bestStreak}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </RetroCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
