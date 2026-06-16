import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Play, 
  CheckCircle, 
  MessageSquare, 
  Phone, 
  Send, 
  MapPin, 
  RefreshCw, 
  User, 
  Briefcase, 
  Shield, 
  PhoneOff, 
  Tv, 
  Smartphone, 
  Users,
  Compass,
  Zap,
  Check,
  SendHorizontal
} from 'lucide-react';

// Custom Map Marker styling using Leaflet DivIcon to avoid missing asset issues in Vite build
const createMarkerIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position: relative;">
        <div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 10;"></div>
        <div style="background-color: ${color}; opacity: 0.3; width: 34px; height: 34px; border-radius: 50%; position: absolute; top: -7px; left: -7px; animation: pulse 2s infinite; z-index: 1;"></div>
        <span style="position: absolute; left: 24px; top: 0px; background: rgba(15, 23, 42, 0.85); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #334155; white-space: nowrap;">${label}</span>
      </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Map Recenter component
function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// User interfaces
interface AppUser {
  id: number;
  username: string;
  email: string;
  role: 'MANAGER' | 'WORKER';
  cognitoSub: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedToId: number;
  createdById: number;
  assignedTo?: AppUser;
  createdBy?: AppUser;
}

interface LocationLog {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface ChatMessage {
  id?: number;
  conversationId: number;
  senderId: number;
  messageText: string;
  createdAt?: string;
}

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'dual' | 'manager' | 'worker'>('dual');
  
  // App state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'call' | 'ai'>('tasks');
  
  // Real-time / Sockets
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Active manager & active selected worker
  const [managerUser, setManagerUser] = useState<AppUser | null>(null);
  const [activeWorker, setActiveWorker] = useState<AppUser | null>(null);
  const [workerUser, setWorkerUser] = useState<AppUser | null>(null);
  
  // Locations Map
  const [locations, setLocations] = useState<Record<number, { lat: number; lng: number }>>({});
  
  // Active conversation & messages
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  
  // AI Assistant state
  const [aiMessage, setAiMessage] = useState('');
  const [aiHistory, setAiHistory] = useState<{ sender: 'USER' | 'AI'; messageText: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssignee, setNewAssignee] = useState<number>(0);

  // WebRTC / Call state
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [activeCallPartner, setActiveCallPartner] = useState<AppUser | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Worker Mobile view specific state
  const [workerSimLat, setWorkerSimLat] = useState(37.7749);
  const [workerSimLng, setWorkerSimLng] = useState(-122.4194);
  const [isSimulating, setIsSimulating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workerMessagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load of Users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch users using the mock manager credentials (which is the default user)
      const res = await fetch('/api/auth/users', {
        headers: { 'Authorization': 'Bearer mock-manager_jane' }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
        const manager = data.find(u => u.role === 'MANAGER');
        const firstWorker = data.find(u => u.role === 'WORKER');
        if (manager) setManagerUser(manager);
        if (firstWorker) {
          setActiveWorker(firstWorker);
          setWorkerUser(firstWorker);
          setNewAssignee(firstWorker.id);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // 2. Fetch Tasks when user roles or users change
  useEffect(() => {
    if (managerUser) {
      fetchTasks();
    }
  }, [managerUser, workerUser]);

  const fetchTasks = async () => {
    if (!managerUser) return;
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer mock-${managerUser.username}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  // Fetch initial location logs of workers
  useEffect(() => {
    const fetchLocations = async () => {
      const workers = users.filter(u => u.role === 'WORKER');
      const locs: Record<number, { lat: number; lng: number }> = {};
      for (const w of workers) {
        try {
          const res = await fetch('/api/location/history', {
            headers: { 'Authorization': `Bearer mock-${w.username}` }
          });
          const history = await res.json();
          if (history && history.length > 0) {
            locs[w.id] = { lat: history[0].latitude, lng: history[0].longitude };
            if (w.id === workerUser?.id) {
              setWorkerSimLat(history[0].latitude);
              setWorkerSimLng(history[0].longitude);
            }
          } else {
            // Default coords
            locs[w.id] = { lat: 37.7749, lng: -122.4194 };
          }
        } catch (e) {
          locs[w.id] = { lat: 37.7749, lng: -122.4194 };
        }
      }
      setLocations(locs);
    };

    if (users.length > 0) {
      fetchLocations();
    }
  }, [users, workerUser]);

  // Load chat messages when manager selects a worker
  useEffect(() => {
    if (!managerUser || !activeWorker) return;
    
    const setupConversation = async () => {
      try {
        const res = await fetch('/api/chat/conversation', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer mock-${managerUser.username}` 
          },
          body: JSON.stringify({ participantId: activeWorker.id })
        });
        const conv = await res.json();
        if (conv && conv.id) {
          setConversationId(conv.id);
          
          // Get historical messages
          const msgRes = await fetch(`/api/chat/conversation/${conv.id}/messages`, {
            headers: { 'Authorization': `Bearer mock-${managerUser.username}` }
          });
          const msgs = await msgRes.json();
          if (Array.isArray(msgs)) {
            setMessages(msgs);
          }
        }
      } catch (err) {
        console.error('Error in conversation setup:', err);
      }
    };

    setupConversation();
  }, [activeWorker, managerUser]);

  // 3. Connect to WebSockets
  useEffect(() => {
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      if (managerUser) {
        newSocket.emit('register', { userId: managerUser.id });
      }
    });

    newSocket.on('message_received', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('location_updated', (data: { userId: number; latitude: number; longitude: number }) => {
      setLocations(prev => ({
        ...prev,
        [data.userId]: { lat: data.latitude, lng: data.longitude }
      }));
    });

    // Handle incoming calls (simulated WebRTC signaling)
    newSocket.on('call_incoming', (data: { from: number; offer: any }) => {
      const caller = users.find(u => u.id === data.from);
      if (caller) {
        setActiveCallPartner(caller);
        setCallState('incoming');
      }
    });

    newSocket.on('call_accepted', (data: { answer: any }) => {
      setCallState('connected');
    });

    newSocket.on('ice_candidate_received', (data: { candidate: any }) => {
      console.log('Received ICE Candidate: ', data.candidate);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [managerUser, users]);

  // Register worker on socket if we view the worker in mobile
  useEffect(() => {
    if (socket && workerUser) {
      socket.emit('register', { userId: workerUser.id });
    }
  }, [socket, workerUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    workerMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // GPS Simulation interval
  useEffect(() => {
    let interval: any;
    if (isSimulating && workerUser) {
      interval = setInterval(() => {
        // Gently drift latitude and longitude to simulate driving
        setWorkerSimLat(prev => {
          const nextLat = prev + (Math.random() - 0.5) * 0.0015;
          setWorkerSimLng(prevLng => {
            const nextLng = prevLng + (Math.random() - 0.5) * 0.0015;
            if (socket) {
              socket.emit('update_location', {
                userId: workerUser.id,
                latitude: nextLat,
                longitude: nextLng
              });
            }
            return nextLng;
          });
          return nextLat;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSimulating, workerUser, socket]);

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAssignee || !managerUser) return;
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-${managerUser.username}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          assignedToId: Number(newAssignee)
        })
      });
      if (response.ok) {
        setNewTitle('');
        setNewDesc('');
        fetchTasks();
      }
    } catch (e) {
      console.error('Error creating task:', e);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, status: Task['status']) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-${workerUser?.username || 'worker_john'}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (e) {
      console.error('Error updating task status:', e);
    }
  };

  const handleSendMessage = (text: string, senderId: number, receiverId: number) => {
    if (!socket || !conversationId || !text.trim()) return;
    socket.emit('send_message', {
      conversationId,
      senderId,
      receiverId,
      text: text.trim()
    });
    setInputText('');
  };

  const startCall = (recipient: AppUser) => {
    if (!socket || !managerUser) return;
    setActiveCallPartner(recipient);
    setCallState('calling');
    socket.emit('call_user', {
      userToCall: recipient.id,
      from: managerUser.id,
      offer: { type: 'offer', sdp: 'dummy-sdp-data' }
    });
  };

  const acceptCall = () => {
    if (!socket || !workerUser || !activeCallPartner) return;
    socket.emit('accept_call', {
      to: activeCallPartner.id,
      answer: { type: 'answer', sdp: 'dummy-sdp-answer' }
    });
    setCallState('connected');
  };

  const endCall = () => {
    setCallState('idle');
    setActiveCallPartner(null);
  };

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim() || !managerUser) return;

    const currentMsg = aiMessage;
    setAiHistory(prev => [...prev, { sender: 'USER', messageText: currentMsg }]);
    setAiMessage('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-${managerUser.username}`
        },
        body: JSON.stringify({ message: currentMsg })
      });
      const data = await res.json();
      setAiHistory(prev => [...prev, { sender: 'AI', messageText: data.response }]);
    } catch (e) {
      setAiHistory(prev => [...prev, { sender: 'AI', messageText: 'Failed to contact AI service.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Find first active worker's location to center map
  const activeWorkerCoords = activeWorker ? locations[activeWorker.id] || { lat: 37.7749, lng: -122.4194 } : { lat: 37.7749, lng: -122.4194 };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <Compass className="logo-icon" size={28} />
          <span className="logo-text">LIVETRACK</span>
        </div>

        <div className="flex align-center gap-4">
          <div className="user-selector">
            <button 
              className={`user-select-btn ${viewMode === 'dual' ? 'active' : ''}`}
              onClick={() => setViewMode('dual')}
            >
              <Users size={16} style={{marginRight: 4}} /> Dual Monitor
            </button>
            <button 
              className={`user-select-btn ${viewMode === 'manager' ? 'active' : ''}`}
              onClick={() => setViewMode('manager')}
            >
              <Tv size={16} style={{marginRight: 4}} /> Manager
            </button>
            <button 
              className={`user-select-btn ${viewMode === 'worker' ? 'active' : ''}`}
              onClick={() => setViewMode('worker')}
            >
              <Smartphone size={16} style={{marginRight: 4}} /> Worker (Sim)
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="main-content" style={{ gridTemplateColumns: viewMode === 'dual' ? '1fr 1fr' : '1fr' }}>
        
        {/* LEFT PANEL: MANAGER PORTAL */}
        {(viewMode === 'dual' || viewMode === 'manager') && (
          <div className="manager-portal-wrapper" style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100%' }}>
              
              {/* Map Column */}
              <div className="map-container-wrapper">
                <MapContainer center={[activeWorkerCoords.lat, activeWorkerCoords.lng]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                  <ChangeMapView center={[activeWorkerCoords.lat, activeWorkerCoords.lng]} />
                  
                  {users.map(u => {
                    const loc = locations[u.id];
                    if (!loc) return null;
                    return (
                      <Marker 
                        key={u.id} 
                        position={[loc.lat, loc.lng]}
                        icon={createMarkerIcon(u.role === 'MANAGER' ? '#6366f1' : '#10b981', u.username)}
                      >
                        <Popup>
                          <strong>{u.username}</strong> <br />
                          Role: {u.role} <br />
                          Lat: {loc.lat.toFixed(5)}, Lng: {loc.lng.toFixed(5)}
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>

              {/* Sidebar Tabs Column */}
              <div className="control-panel">
                <div className="panel-tabs">
                  <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
                    <Briefcase size={18} />
                    <span>Tasks</span>
                  </button>
                  <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                    <MessageSquare size={18} />
                    <span>Chat</span>
                  </button>
                  <button className={`tab-btn ${activeTab === 'call' ? 'active' : ''}`} onClick={() => setActiveTab('call')}>
                    <Phone size={18} />
                    <span>Voip Call</span>
                  </button>
                  <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
                    <Zap size={18} />
                    <span>AI Help</span>
                  </button>
                </div>

                <div className="tab-content">
                  {/* TASKS TAB */}
                  {activeTab === 'tasks' && (
                    <>
                      <div className="card">
                        <div className="card-title">Create New Task</div>
                        <form onSubmit={handleCreateTask}>
                          <div className="form-group">
                            <label>Task Title</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={newTitle} 
                              onChange={e => setNewTitle(e.target.value)} 
                              placeholder="Repair generator..." 
                              required 
                            />
                          </div>
                          <div className="form-group">
                            <label>Description</label>
                            <textarea 
                              className="form-control" 
                              value={newDesc} 
                              onChange={e => setNewDesc(e.target.value)} 
                              placeholder="Brief instructions..."
                            />
                          </div>
                          <div className="form-group">
                            <label>Assignee</label>
                            <select 
                              className="form-control" 
                              value={newAssignee} 
                              onChange={e => setNewAssignee(Number(e.target.value))}
                            >
                              {users.filter(u => u.role === 'WORKER').map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                              ))}
                            </select>
                          </div>
                          <button type="submit" className="btn w-full">Create & Assign</button>
                        </form>
                      </div>

                      <div className="card">
                        <div className="card-title">Active Tasks</div>
                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                          {tasks.map(t => (
                            <div key={t.id} className="task-item">
                              <div className="task-header">
                                <span className="task-title">{t.title}</span>
                                <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                              </div>
                              <p className="task-desc">{t.description}</p>
                              <span className="task-assignee">
                                <User size={12} /> Assigned to: {users.find(u => u.id === t.assignedToId)?.username || 'Unassigned'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* CHAT TAB */}
                  {activeTab === 'chat' && (
                    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div className="card-title">
                        <span>Chat with {activeWorker?.username}</span>
                        <select 
                          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: 4, padding: 2 }}
                          value={activeWorker?.id || ''} 
                          onChange={(e) => {
                            const selected = users.find(u => u.id === Number(e.target.value));
                            if (selected) setActiveWorker(selected);
                          }}
                        >
                          {users.filter(u => u.role === 'WORKER').map(u => (
                            <option key={u.id} value={u.id}>{u.username}</option>
                          ))}
                        </select>
                      </div>

                      <div className="chat-window">
                        <div className="chat-messages">
                          {messages.filter(m => m.conversationId === conversationId).map((msg, i) => (
                            <div key={i} className={`chat-message ${msg.senderId === managerUser?.id ? 'sent' : 'received'}`}>
                              <div>{msg.messageText}</div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                        <div className="chat-input-area mt-auto">
                          <input 
                            type="text" 
                            className="form-control flex-1" 
                            placeholder="Type a message..." 
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText, managerUser?.id || 0, activeWorker?.id || 0)}
                          />
                          <button 
                            className="btn"
                            onClick={() => handleSendMessage(inputText, managerUser?.id || 0, activeWorker?.id || 0)}
                          >
                            <SendHorizontal size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CALL TAB */}
                  {activeTab === 'call' && (
                    <div className="card">
                      <div className="card-title">WebRTC Voip Room</div>
                      {callState === 'idle' && (
                        <div className="text-center">
                          <p className="text-muted mb-4">No active call sessions.</p>
                          <button 
                            className="btn" 
                            disabled={!activeWorker} 
                            onClick={() => activeWorker && startCall(activeWorker)}
                          >
                            <Phone size={16} /> Call {activeWorker?.username}
                          </button>
                        </div>
                      )}

                      {callState === 'calling' && (
                        <div className="call-widget">
                          <div className="call-avatar">📞</div>
                          <div className="call-status">Dialing...</div>
                          <div className="call-name">{activeCallPartner?.username}</div>
                          <button className="btn-call-end" onClick={endCall}><PhoneOff size={20} /></button>
                        </div>
                      )}

                      {callState === 'connected' && (
                        <div className="call-widget">
                          <div className="video-grid">
                            <div className="video-box">
                              {isCameraOff ? <span className="text-muted text-xs">Camera Off</span> : <div style={{width:'100%', height:'100%', background:'#334155'}} />}
                              <div className="video-label">You (Manager)</div>
                            </div>
                            <div className="video-box">
                              <div style={{width:'100%', height:'100%', background:'#475569'}} />
                              <div className="video-label">{activeCallPartner?.username}</div>
                            </div>
                          </div>
                          <div className="call-status" style={{color: 'var(--success)'}}>Connected</div>
                          <div className="call-actions">
                            <button className="btn-call-end" onClick={endCall}><PhoneOff size={20} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI HELP TAB */}
                  {activeTab === 'ai' && (
                    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div className="card-title">AI Assistant (Gemini)</div>
                      <div className="chat-window">
                        <div className="chat-messages">
                          <div className="chat-message received">
                            <div>Hello, I am your operations assistant. Ask me anything about your current tasks or workers!</div>
                          </div>
                          {aiHistory.map((msg, i) => (
                            <div key={i} className={`chat-message ${msg.sender === 'USER' ? 'sent' : 'received'}`}>
                              <div>{msg.messageText}</div>
                            </div>
                          ))}
                          {isAiLoading && (
                            <div className="chat-message received">
                              <div className="flex-row-center"><RefreshCw size={14} className="animate-spin" /> Thinking...</div>
                            </div>
                          )}
                        </div>
                        <form onSubmit={handleSendAiMessage} className="chat-input-area mt-auto">
                          <input 
                            type="text" 
                            className="form-control flex-1" 
                            placeholder="Ask Gemini..." 
                            value={aiMessage}
                            onChange={e => setAiMessage(e.target.value)}
                          />
                          <button type="submit" className="btn"><Send size={18} /></button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* RIGHT PANEL: WORKER MOBILE SIMULATOR */}
        {(viewMode === 'dual' || viewMode === 'worker') && (
          <div style={{ padding: '1rem', background: '#090d16', overflowY: 'auto' }}>
            <div className="mobile-simulator">
              <div className="mobile-notch"></div>
              <div className="mobile-screen">
                <div className="mobile-header">
                  <span>📱 Worker App</span>
                  <select 
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: '11px' }}
                    value={workerUser?.id || ''} 
                    onChange={(e) => {
                      const selected = users.find(u => u.id === Number(e.target.value));
                      if (selected) {
                        setWorkerUser(selected);
                      }
                    }}
                  >
                    {users.filter(u => u.role === 'WORKER').map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mobile-content">
                  {/* Incoming Call Dialog in Mobile */}
                  {callState === 'incoming' && (
                    <div className="call-widget" style={{position:'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, margin: '20px'}}>
                      <div className="call-avatar">📞</div>
                      <div className="call-status">Incoming Call...</div>
                      <div className="call-name">Manager Jane</div>
                      <div className="call-actions">
                        <button className="btn-call-accept" onClick={acceptCall}><Check size={20} /></button>
                        <button className="btn-call-end" onClick={endCall}><PhoneOff size={20} /></button>
                      </div>
                    </div>
                  )}

                  {/* Active Call in Mobile */}
                  {callState === 'connected' && (
                    <div className="card" style={{backgroundColor: '#0f172a'}}>
                      <div className="call-status">Call Connected</div>
                      <div className="video-grid">
                        <div className="video-box">
                          <div style={{width:'100%', height:'100%', background:'#475569'}} />
                          <div className="video-label">Self (Worker)</div>
                        </div>
                        <div className="video-box">
                          <div style={{width:'100%', height:'100%', background:'#334155'}} />
                          <div className="video-label">Manager</div>
                        </div>
                      </div>
                      <button className="btn w-full" style={{backgroundColor: 'var(--danger)'}} onClick={endCall}>End Call</button>
                    </div>
                  )}

                  {/* GPS Transmitter */}
                  <div className="card">
                    <div className="card-title">
                      <span className="flex-row-center"><MapPin size={16} /> GPS Transmitter</span>
                    </div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px'}}>
                      Lat: {workerSimLat.toFixed(5)}, Lng: {workerSimLng.toFixed(5)}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className={`btn flex-1 ${isSimulating ? 'btn-secondary' : ''}`} 
                        onClick={() => setIsSimulating(!isSimulating)}
                      >
                        {isSimulating ? 'Stop GPS Simulation' : 'Start GPS Simulation'}
                      </button>
                    </div>
                  </div>

                  {/* Tasks List for Worker */}
                  <div className="card" style={{flex: 1, minHeight: '150px', overflowY: 'auto'}}>
                    <div className="card-title">My Tasks</div>
                    {tasks.filter(t => t.assignedToId === workerUser?.id).length === 0 ? (
                      <p className="text-muted text-center">No tasks assigned.</p>
                    ) : (
                      tasks.filter(t => t.assignedToId === workerUser?.id).map(t => (
                        <div key={t.id} className="task-item">
                          <div className="task-header">
                            <span className="task-title">{t.title}</span>
                            <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                          </div>
                          <p className="task-desc">{t.description}</p>
                          <div className="flex gap-2">
                            {t.status === 'PENDING' && (
                              <button 
                                className="btn btn-sm flex-1" 
                                style={{fontSize: '11px', padding: '4px'}}
                                onClick={() => handleUpdateTaskStatus(t.id, 'IN_PROGRESS')}
                              >
                                Accept
                              </button>
                            )}
                            {t.status === 'IN_PROGRESS' && (
                              <button 
                                className="btn btn-sm flex-1" 
                                style={{backgroundColor: 'var(--success)', fontSize: '11px', padding: '4px'}}
                                onClick={() => handleUpdateTaskStatus(t.id, 'COMPLETED')}
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Mini-Chat with Manager */}
                  <div className="card" style={{height: '200px', display:'flex', flexDirection:'column'}}>
                    <div className="card-title" style={{fontSize: '0.9rem', marginBottom: 5}}>Chat with Manager</div>
                    <div className="chat-messages" style={{maxHeight: '110px'}}>
                      {messages.filter(m => m.conversationId === conversationId).map((msg, i) => (
                        <div key={i} className={`chat-message ${msg.senderId === workerUser?.id ? 'sent' : 'received'}`}>
                          <div>{msg.messageText}</div>
                        </div>
                      ))}
                      <div ref={workerMessagesEndRef} />
                    </div>
                    <div className="chat-input-area mt-auto">
                      <input 
                        type="text" 
                        className="form-control flex-1" 
                        style={{padding: '5px', fontSize: '12px'}}
                        placeholder="Type a message..." 
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const input = e.currentTarget;
                            handleSendMessage(input.value, workerUser?.id || 0, managerUser?.id || 0);
                            input.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
