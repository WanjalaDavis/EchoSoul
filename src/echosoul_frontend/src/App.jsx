import React, { useState, useEffect } from "react";
import { echosoul_backend } from "../../declarations/echosoul_backend";
import { Principal } from "@dfinity/principal";
import { AuthClient } from "@dfinity/auth-client";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { chatWithGPT } from "./api/openai";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import axios from "axios";

import { UploadButton, UploadDropzone } from "@uploadthing/react";
import { createUploadthing } from "@uploadthing/react";

import "./index.scss";


const App = () => {
  const [authClient, setAuthClient] = useState(null);
  const [principal, setPrincipal] = useState(null);
  const [activeTab, setActiveTab] = useState("memories");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");


  // User state
  const [user, setUser] = useState({
    username: "",
    bio: "",
    avatar: null,
    isRegistered: false
  });

      // Memory state
      const [memory, setMemory] = useState({
        text: "",
        tags: "",
        emotion: "",
        imageUrl: "",
        audioUrl: ""
      });


  // App data
  const [memories, setMemories] = useState([]);
  const [connections, setConnections] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

    const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();


  const handleVoiceInput = () => {
  if (!browserSupportsSpeechRecognition) {
    setError("Your browser does not support speech recognition.");
    return;
  }

  resetTranscript();
  SpeechRecognition.startListening({ continuous: false, language: "en-US" });

  setTimeout(() => {
    SpeechRecognition.stopListening();
    if (transcript.trim()) {
      setChatInput(transcript.trim());
    } else {
      setError("Didn't catch that. Try speaking louder.");
    }
  }, 5000); // Listen for 5 seconds
};



  useEffect(() => {
    const initAuth = async () => {
      const client = await AuthClient.create();
      setAuthClient(client);
      if (await client.isAuthenticated()) {
        handleAuthenticated(client);
      }
    };
    initAuth();
  }, []);

  const handleAuthenticated = async (client) => {
    const identity = client.getIdentity();
    const principal = identity.getPrincipal();
    setPrincipal(principal);
    checkUserRegistration(principal);
  };

  const login = async () => {
    await authClient.login({
      identityProvider: "https://identity.ic0.app",
      onSuccess: () => handleAuthenticated(authClient),
    });
  };

  const logout = async () => {
    await authClient.logout();
    setPrincipal(null);
    setUser({ username: "", bio: "", avatar: null, isRegistered: false });
    setChatMessages([]);
  };

  const checkUserRegistration = async (principal) => {
    try {
      const userMemories = await echosoul_backend.getUserMemories(principal);
      if (userMemories.length > 0) {
        const allUsers = await echosoul_backend.getAllUsers();
        const username = allUsers.find(u => u.principal === principal.toString())?.username;
        if (username) {
          setUser(prev => ({
            ...prev,
            username,
            isRegistered: true
          }));
          fetchUserData(username);
        }
      }
    } catch (error) {
      console.error("Error checking registration:", error);
    }
  };

  
const handleUsernameLogin = async () => {
  const trimmedUsername = user.username.trim();
  if (!trimmedUsername) {
    setError("Username is required");
    return;
  }

  try {
    const result = await echosoul_backend.getUserByUsername(trimmedUsername);

    if (result.length === 0) {
      setError("Username not found. Please register.");
      return;
    }

    const [principalObj, profile] = result;

    setPrincipal(Principal.fromText(principalObj.toText())); // Set principal

    setUser((prev) => ({
      ...prev,
      isRegistered: true,
      username: profile.username,
      bio: profile.bio,
      avatar: profile.avatar,
    }));

    fetchUserData(profile.username);
  } catch (error) {
    console.error("Username login failed:", error);
    setError("Login failed. Try again.");
  }
};


  const registerUser = async () => {
    const trimmedUsername = user.username.trim();
    if (!trimmedUsername) {
      setError("Username is required");
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      setError("Username must be 3-20 characters");
      return;
    }
    if (trimmedUsername.includes(" ")) {
      setError("Username cannot contain spaces");
      return;
    }
    if (!user.bio) {
      setError("Bio is required");
      return;
    }
    if (user.bio.length < 10 || user.bio.length > 500) {
      setError("Bio must be 10-500 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
        const result = await echosoul_backend.registerUser(
          trimmedUsername,
          user.bio,
          user.avatar ? [user.avatar] : []
        );

          if ("ok" in result) {
            setUser(prev => ({
              ...prev,
              username: trimmedUsername,
              isRegistered: true
            }));
            fetchUserData(trimmedUsername);
          } else if ("err" in result) {
            setError(result.err);
          }


    } catch (error) {
      console.error("Registration failed:", error);
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const addMemory = async () => {
    const trimmedText = memory.text.trim();
    
    if (!trimmedText) {
      setError("Memory text is required");
      return;
    }
    
    if (trimmedText.length < 5 || trimmedText.length > 1000) {
      setError("Memory must be 5-1000 characters");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const tags = memory.tags.split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      const emotion = memory.emotion ? memory.emotion : null;

const newMemory = await echosoul_backend.addMemory(
  trimmedText,
  tags,
  memory.emotion ? [memory.emotion] : [],
  memory.imageUrl ? [memory.imageUrl] : [],
  memory.audioUrl ? [memory.audioUrl] : []
);

    
      setMemories(prev => [newMemory, ...prev]);
      setMemory({ text: "", tags: "", emotion: "", imageUrl: "", audioUrl: "" });
    } catch (error) {
      console.error("Error adding memory:", error);
      setError("Failed to add memory. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (username) => {
    try {
      const [userMemories, stats] = await Promise.all([
        echosoul_backend.getUserMemories(principal),
        echosoul_backend.getMemoryStats()
      ]);
      
      setMemories(userMemories);
      setStats(stats);
      
      const summary = await echosoul_backend.generateMemorySummary(principal);
      if (summary) setSummary(summary);
      
      const users = await echosoul_backend.getAllUsers();
      setAllUsers(users);
      
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to load user data");
    }
  };

        const connectWithUser = async (otherPrincipal) => {
  console.log("Attempting to connect with:", otherPrincipal); // Debug log
  
  if (!otherPrincipal || typeof otherPrincipal !== "string") {
    console.error("Invalid principal:", otherPrincipal);
    setError("Invalid user selected for connection.");
    return;
  }

  try {
    console.log("Converting principal:", otherPrincipal);
    const principalObj = Principal.fromText(otherPrincipal);
    console.log("Converted principal:", principalObj.toString());
    
    const result = await echosoul_backend.connectWith(principalObj);
    console.log("Backend response:", result);

    if (result === "Connection established successfully!") {
      fetchUserData(user.username);
    } else {
      setError(result);
    }
  } catch (error) {
    console.error("Detailed connection error:", error);
    setError(`Failed to connect: ${error.message}`);
  }
};

const chatWithEchoSoul = async () => {
  const trimmedInput = chatInput.trim();
  if (!trimmedInput) return;

  try {
    const userMessage = {
      sender: "user",
      text: trimmedInput,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setLoading(true);

    // 🧠 Build conversation messages (just history + new input)
    const messages = [
      ...chatMessages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text
      })),
      { role: "user", content: trimmedInput }
    ];

    // 🤖 Call GPT via openai.js (which handles memory summary)
    const responseText = await chatWithGPT(messages); // no principal passed

    const botMessage = {
      sender: "bot",
      text: responseText,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, botMessage]);
  } catch (error) {
    console.error("Chat error:", error);
    setError("Failed to get response from EchoSoul.");
  } finally {
    setLoading(false);
  }
};


const generateImageFromPrompt = async () => {
  if (!imagePrompt.trim()) {
    setError("Please describe what you want to generate.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const res = await axios.post("http://localhost:3001/api/image", { prompt: imagePrompt });
    const url = res.data.imageUrl;

    if (url) {
      setGeneratedImageUrl(url);
    } else {
      setError("Image generation failed. Try again.");
    }
  } catch (error) {
    console.error("Image generation error:", error);
    setError("Server error during image generation.");
  } finally {
    setLoading(false);
  }
};


  if (!authClient) return <div className="loading-screen">Initializing...</div>;

  if (!principal) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="app-logo">
            <i className="fas fa-brain"></i>
            <h1>EchoSoul</h1>
          </div>
          <p className="app-tagline">Your digital memory companion</p>
          <button onClick={login} className="login-btn">
            <i className="fas fa-sign-in-alt"></i> Login with Internet Identity
          </button>
        </div>
      </div>
    );
  }
// ... (all the imports and state declarations remain the same)

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">          
          <p>Preserving your digital consciousness</p>
        </div>
        <div className="user-info">
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" className="avatar" />
          ) : (
            <div className="avatar-placeholder">
              <i className="fas fa-user"></i>
            </div>
          )}
          <span className="username">{user.username || "New User"}</span>
          <button onClick={logout} className="logout-btn" title="Logout">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {!user.isRegistered ? (
          <div className="registration-card">
            <h2><i className="fas fa-user-plus"></i> Complete Your Profile</h2>
            {error && <div className="error-message">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>}
            
            <div className="form-group">
              <label>
                <i className="fas fa-user"></i> Username 
                <span className="hint">(3-20 characters, no spaces)</span>
              </label>
              <input
                type="text"
                value={user.username}
                onChange={(e) => setUser({ ...user, username: e.target.value })}
                placeholder="Choose a username"
                maxLength={20}
              />
            </div>
            
            <div className="form-group">
              <label>
                <i className="fas fa-info-circle"></i> Bio
                <span className="hint">(10-500 characters)</span>
              </label>
              <textarea
                value={user.bio}
                onChange={(e) => setUser({ ...user, bio: e.target.value })}
                placeholder="Tell us about yourself"
                rows="4"
                maxLength={500}
              />
            </div>

            {/* Avatar URL field */}
            <div className="form-group">
              <label><i className="fas fa-image"></i> Avatar URL (optional)</label>
              <input
                type="text"
                value={user.avatar || ""}
                onChange={(e) => setUser({ ...user, avatar: e.target.value })}
                placeholder="Paste an image URL"
              />
            </div>

            {/* Registration button */}
            <button 
              onClick={registerUser} 
              disabled={loading || !user.username.trim() || !user.bio.trim()}
              className="primary-btn"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Registering...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i> Complete Registration
                </>
              )}
            </button>


                    <div className="form-separator">
          <hr />
          <span>OR</span>
          <hr />
        </div>

        <div className="form-group">
          <label><i className="fas fa-user-check"></i> Already Registered?</label>
          <input
            type="text"
            value={user.username}
            onChange={(e) => setUser({ ...user, username: e.target.value })}
            placeholder="Enter your username to login"
          />
        </div>

        <button 
          onClick={handleUsernameLogin} 
          className="secondary-btn"
        >
          <i className="fas fa-sign-in-alt"></i> Login with Username
        </button>




          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <nav className="app-nav">
              <button
                className={activeTab === "memories" ? "active" : ""}
                onClick={() => setActiveTab("memories")}
              >
                <i className="fas fa-brain"></i> Memories
              </button>
              <button
                className={activeTab === "add" ? "active" : ""}
                onClick={() => setActiveTab("add")}
              >
                <i className="fas fa-plus"></i> Add Memory
              </button>
              <button
                className={activeTab === "connect" ? "active" : ""}
                onClick={() => setActiveTab("connect")}
              >
                <i className="fas fa-users"></i> Connect
              </button>
              <button
                className={activeTab === "chat" ? "active" : ""}
                onClick={() => setActiveTab("chat")}
              >
                <i className="fas fa-comment-dots"></i> Chat
              </button>

              <button
              className={activeTab === "image" ? "active" : ""}
              onClick={() => setActiveTab("image")}
            >
              <i className="fas fa-image"></i> Generate Image
            </button>


            </nav>

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Tab Content */}
            <div className="tab-content">


                              {activeTab === "image" && (
                  <div className="image-tab">
                    <h2><i className="fas fa-image"></i> Generate Image from Prompt</h2>
                    
                    <div className="form-group">
                      <label><i className="fas fa-pencil-alt"></i> Describe the image</label>
                      <input
                        type="text"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="e.g., a futuristic city with flying cars"
                      />
                    </div>

                    <button 
                      onClick={generateImageFromPrompt} 
                      className="primary-btn"
                      disabled={loading || !imagePrompt.trim()}
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Generating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-magic"></i> Generate Image
                        </>
                      )}
                    </button>

                    {generatedImageUrl && (
                      <div className="generated-image-container">
                        <h4><i className="fas fa-eye"></i> Result</h4>
                        <img src={generatedImageUrl} alt="Generated" style={{ maxWidth: "100%", marginTop: "1rem" }} />
                      </div>
                    )}
                  </div>
                )}



              {activeTab === "memories" && (
                <div className="memories-tab">
                  {summary && (
                    <div className="summary-card">
                      <h3><i className="fas fa-chart-pie"></i> Your Memory Summary</h3>
                      <p>{summary}</p>
                    </div>
                  )}

                  <div className="stats-card">
                    <h3><i className="fas fa-chart-line"></i> Your Stats</h3>
                    {stats && (
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-value">{stats.totalMemories}</span>
                          <span className="stat-label">Memories</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">
                            {stats.avgMemoriesPerUser.toFixed(1)}
                          </span>
                          <span className="stat-label">Avg. Per User</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{connections.length}</span>
                          <span className="stat-label">Connections</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <h3><i className="fas fa-history"></i> Your Memory Timeline</h3>
                  {memories.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-inbox"></i>
                      <p>No memories yet. Add your first memory!</p>
                    </div>
                  ) : (
                    <div className="memory-timeline">
                      {memories.map((m) => (
                        <div key={m.id} className="memory-card">
                          <div className="memory-header">
                            <span className="memory-date">
                              <i className="fas fa-clock"></i> {new Date(Number(m.timestamp)).toLocaleString()}

                            </span>
                            {m.emotion && (
                              <span className="memory-emotion">{m.emotion}</span>
                            )}
                          </div>
                          <p className="memory-text">{m.text}</p>


                         {m.imageUrl && (
                        <div className="memory-media">
                          <img src={m.imageUrl} alt="Memory" className="memory-image" />
                        </div>
                      )}

                      {m.audioUrl && (
                        <div className="memory-media">
                          <audio controls src={m.audioUrl}></audio>
                        </div>
                      )}



                          {m.tags.length > 0 && (
                            <div className="memory-tags">
                              {m.tags.map((tag, i) => (
                                <span key={i} className="tag">
                                  <i className="fas fa-tag"></i> {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "add" && (
                <div className="add-memory-tab">
                  <h2><i className="fas fa-plus-circle"></i> Capture a Memory</h2>
                  <div className="memory-form">
                    <div className="form-group">
                      <label><i className="fas fa-pen"></i> What's on your mind?</label>
                      <textarea
                        value={memory.text}
                        onChange={(e) =>
                          setMemory({ ...memory, text: e.target.value })
                        }
                        placeholder="Write your memory here..."
                        rows="6"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group half-width">
                        <label><i className="fas fa-tags"></i> Tags (comma separated)</label>
                        <input
                          type="text"
                          value={memory.tags}
                          onChange={(e) =>
                            setMemory({ ...memory, tags: e.target.value })
                          }
                          placeholder="e.g., travel, family, ideas"
                        />
                      </div>
                      <div className="form-group half-width">
                        <label><i className="fas fa-smile"></i> Current Emotion</label>
                        <select
                          value={memory.emotion}
                          onChange={(e) =>
                            setMemory({ ...memory, emotion: e.target.value })
                          }
                        >
                          <option value="">Select an emotion</option>
                          <option value="😊 Happy">😊 Happy</option>
                          <option value="😢 Sad">😢 Sad</option>
                          <option value="😮 Surprised">😮 Surprised</option>
                          <option value="😠 Angry">😠 Angry</option>
                          <option value="😌 Peaceful">😌 Peaceful</option>
                          <option value="🤔 Thoughtful">🤔 Thoughtful</option>
                          <option value="💡 Idea">💡 Idea</option>
                          <option value="🏥 Health">🏥 Health</option>
                        </select>                         
                          </div>
                          </div> {/* <== THIS is already in your code. Add BELOW it: */}

                         <div className="form-row">
                      <div className="form-group half-width">
                        <label><i className="fas fa-image"></i> Upload Image (optional)</label>
                        <UploadDropzone
                          endpoint="memoryUploader"
                          onClientUploadComplete={(res) => {
                            setMemory(prev => ({ ...prev, imageUrl: res[0].url }));
                          }}
                          onUploadError={(err) => setError(`Upload failed: ${err.message}`)}
                          maxSize={5 * 1024 * 1024} // 5MB
                          acceptedFileTypes={["image/png", "image/jpeg"]}
                        />
                      </div>
                      <div className="form-group half-width">
                        <label><i className="fas fa-microphone"></i> Upload Audio/Video (optional)</label>
                        <UploadDropzone
                          endpoint="memoryUploader"
                          onClientUploadComplete={(res) => {
                            setMemory(prev => ({ ...prev, audioUrl: res[0].url }));
                          }}
                          onUploadError={(err) => setError(`Upload failed: ${err.message}`)}
                          maxSize={10 * 1024 * 1024} // 10MB
                          acceptedFileTypes={["audio/mpeg", "audio/wav", "video/mp4"]}
                        />
                      </div>
                          

                      </div>
                    </div>
                    <button 
                      onClick={addMemory} 
                      disabled={loading || !memory.text}
                      className="primary-btn"
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i> Save Memory
                        </>
                      )}
                    </button>
                  </div>
                
              )}

              {activeTab === "connect" && (
                <div className="connect-tab">
                  <h2><i className="fas fa-network-wired"></i> Connect with Others</h2>
                  <div className="connections-grid">
                    <div className="connections-list">
                      <h3><i className="fas fa-link"></i> Your Connections</h3>
                      {connections.length === 0 ? (
                        <div className="empty-state">
                          <i className="fas fa-unlink"></i>
                          <p>No connections yet</p>
                        </div>
                      ) : (
                        <ul>
                          {connections.map((conn, i) => (
                            <li key={i}>
                              <i className="fas fa-user-friends"></i> {conn.username}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="discover-users">
                      <h3><i className="fas fa-search"></i> Discover EchoSoul Users</h3>
                      {allUsers.length === 0 ? (
                        <div className="empty-state">
                          <i className="fas fa-users-slash"></i>
                          <p>No other users found</p>
                        </div>
                      ) : (
                        <div className="user-cards">

                          {allUsers
                            .filter(([p]) => p.toString() !== principal.toString())
                            .map(([p, profile]) => (
                              <div key={p.toString()} className="user-card">
                                <div className="user-info">
                                  <i className="fas fa-user-circle"></i>
                                  <span className="username">{profile.username}</span>
                                </div>
                                <button onClick={() => connectWithUser(p.toString())}>Connect</button>
                              </div>
                          ))}


                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "chat" && (
                <div className="chat-tab">
                  <h2><i className="fas fa-robot"></i> Chat with Your EchoSoul</h2>
                  <div className="chat-container">
                    <div className="chat-messages">
                      {chatMessages.length === 0 ? (
                        <div className="empty-chat">
                          <i className="fas fa-comments"></i>
                          <p>Start a conversation with your EchoSoul</p>
                          <p>It will respond based on your memories</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, index) => (
                          <div 
                            key={index} 
                            className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}
                          >
                            <div className="message-header">
                              {msg.sender === 'user' ? (
                                <>
                                  <i className="fas fa-user"></i> You
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-robot"></i> EchoSoul
                                </>
                              )}
                              <span className="message-time">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="message-content">
                              {msg.text}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="chat-input-container">
                       <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask your EchoSoul something..."
                          onKeyPress={(e) => e.key === "Enter" && chatWithEchoSoul()}
                          disabled={loading}
                        />

                        <button
                          onClick={handleVoiceInput}
                          className="mic-btn"
                          title="Speak to EchoSoul"
                        >
                          <i className={`fas ${listening ? "fa-microphone" : "fa-microphone-slash"}`}></i>
                        </button>

                        <button
                          onClick={chatWithEchoSoul}
                          disabled={loading || !chatInput.trim()}
                          className="send-btn"
                        >
                          {loading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fas fa-paper-plane"></i>
                          )}
                        </button>

                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

  


      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default App;