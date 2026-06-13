import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Power } from 'lucide-react';
import { LiveSession, SessionState } from './lib/LiveSession';
import rudraAvatar from './assets/images/rudra_avatar_1781319987579.jpg';
import AdBanner from './components/AdBanner';

export default function App() {
  const [state, setState] = useState<SessionState>('disconnected');
  const sessionRef = useRef<LiveSession | null>(null);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, []);

  const toggleSession = () => {
    if (state === 'disconnected') {
      sessionRef.current = new LiveSession((newState) => {
        setState(newState);
      });
      sessionRef.current.connect();
    } else {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
        sessionRef.current = null;
      }
    }
  };

  const getOrbColor = () => {
    switch (state) {
      case 'disconnected': return 'bg-zinc-800 shadow-zinc-800/50';
      case 'connecting': return 'bg-amber-400 shadow-amber-400/60';
      case 'listening': return 'bg-cyan-400 shadow-cyan-400/70';
      case 'speaking': return 'bg-fuchsia-500 shadow-fuchsia-500/80';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'disconnected': return 'Tap to Wake Rudra';
      case 'connecting': return 'Connecting to Neural Core...';
      case 'listening': return 'Listening...';
      case 'speaking': return 'Speaking...';
    }
  };

  const isConnected = state !== 'disconnected';

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <motion.div
          animate={{
            scale: state === 'speaking' ? [1, 1.2, 1] : state === 'listening' ? [1, 1.05, 1] : 1,
            opacity: state === 'disconnected' ? 0 : 0.1,
          }}
          transition={{
            duration: state === 'speaking' ? 0.5 : 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`w-[150vmin] h-[150vmin] rounded-full blur-3xl ${getOrbColor().split(' ')[0]}`}
        />
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 flex justify-center text-center z-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-white/90">
            Rudra <span className="text-white/50">Core</span>
          </h1>
          <p className="text-sm font-mono text-white/40 tracking-wider">
            {state === 'disconnected' ? 'SYSTEM IDLE' : 'LINK ACTIVE'}
          </p>
        </div>
      </div>

      {/* Main Orb / Button */}
      <div className="relative z-20 flex items-center justify-center group flex-1 w-full">
        <button
          onClick={toggleSession}
          className="relative flex items-center justify-center w-40 h-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20 rounded-full"
          aria-label={isConnected ? "Disconnect from Rudra" : "Connect to Rudra"}
        >
          {/* Ripple effects */}
          {isConnected && (
            <>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                className={`absolute inset-0 rounded-full ${getOrbColor()} mix-blend-screen opacity-20`}
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                className={`absolute inset-0 rounded-full ${getOrbColor()} mix-blend-screen opacity-20`}
              />
            </>
          )}

          {/* Core Orb with Avatar */}
          <motion.div
            animate={{
              scale: state === 'speaking' ? [1, 1.1, 1] : state === 'listening' ? [1, 1.02, 1] : 1,
            }}
            transition={{
              duration: state === 'speaking' ? 0.3 : 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute inset-0 rounded-full transition-colors duration-500 ease-out shadow-[0_0_40px_var(--tw-shadow-color)] ${getOrbColor()} overflow-hidden border-2 border-white/10 relative group`}
          >
            <img 
              src={rudraAvatar} 
              alt="Rudra Avatar" 
              className={`w-full h-full object-cover transition-all duration-700 ${state === 'disconnected' ? 'grayscale opacity-50' : 'grayscale-0 opacity-100'} object-center`}
            />
            {state === 'disconnected' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Power className="w-12 h-12 text-white/50" strokeWidth={2} />
              </div>
            )}
          </motion.div>
          
          {state !== 'disconnected' && (
             <div className="absolute -bottom-16">
               <span className="flex h-3 w-3 relative">
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${state === 'listening' ? 'bg-cyan-400' : 'bg-fuchsia-400'} opacity-75`}></span>
                 <span className={`relative inline-flex rounded-full h-3 w-3 ${state === 'listening' ? 'bg-cyan-500' : 'bg-fuchsia-500'}`}></span>
               </span>
             </div>
          )}
        </button>
      </div>

      {/* Status Footer */}
      <div className="absolute bottom-28 left-0 right-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="font-mono text-sm tracking-widest text-white/70 uppercase"
        >
          {getStatusText()}
        </motion.p>
      </div>

      {/* Ad Banner */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md">
        <AdBanner />
      </div>

    </main>

  );
}
