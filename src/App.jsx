
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const demoVideos = [
  {
    id: 1,
    title: "Welcome to LASAR",
    channel: "LASAR",
    views: "12K views",
    time: "2 days ago",
    duration: "10:24",
    category: "All",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 2,
    title: "How to Build a Website",
    channel: "Tech Academy",
    views: "89K views",
    time: "3 days ago",
    duration: "10:24",
    category: "Gaming",
    image:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 3,
    title: "Coding for Beginners",
    channel: "Code World",
    views: "45K views",
    time: "5 days ago",
    duration: "09:32",
    category: "Learning",
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 4,
    title: "Amazing Technology",
    channel: "Future Tech",
    views: "34K views",
    time: "1 week ago",
    duration: "06:18",
    category: "Technology",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 5,
    title: "Beautiful World",
    channel: "Travel Life",
    views: "67K views",
    time: "1 week ago",
    duration: "12:45",
    category: "Movies",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 6,
    title: "Best Music Collection",
    channel: "LASAR Music",
    views: "120K views",
    time: "2 weeks ago",
    duration: "08:42",
    category: "Music",
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
  },
];

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authMode, setAuthMode] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoFile, setVideoFile] = useState(null);

  const [videos, setVideos] = useState(demoVideos);

  const categories = [
    "All",
    "Music",
    "Gaming",
    "Movies",
    "Learning",
    "Technology",
  ];

  // --------------------------------------------------
  // SUPABASE LOGIN SESSION
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------
  // CLEAR MESSAGES
  // --------------------------------------------------

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  // --------------------------------------------------
  // SIGN UP
  // --------------------------------------------------

  async function handleCreateAccount(e) {
    e.preventDefault();

    clearMessages();

    if (!username.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
        },
        emailRedirectTo: window.location.origin,
      },
    });

    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      setSuccess("Account created successfully!");
      closeAuth();
    } else {
      setSuccess(
        "Account created! Please check your email and click the confirmation link before signing in."
      );
      setAuthMode("signin");
    }
  }

  // --------------------------------------------------
  // SIGN IN
  // --------------------------------------------------

  async function handleSignIn(e) {
    e.preventDefault();

    clearMessages();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setBusy(true);

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setBusy(false);

    if (signInError) {
      if (
        signInError.message.toLowerCase().includes("email not confirmed")
      ) {
        setError(
          "Your email is not confirmed yet. Check your email and click the confirmation link."
        );
      } else {
        setError("Invalid email or password.");
      }
      return;
    }

    setUser(data.user);
    setSuccess("Signed in successfully!");
    closeAuth();
  }

  // --------------------------------------------------
  // FORGOT PASSWORD
  // --------------------------------------------------

  async function handleForgotPassword() {
    clearMessages();

    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setBusy(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

    setBusy(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(
      "Password reset email sent. Check your inbox and Spam folder."
    );
  }

  // --------------------------------------------------
  // SIGN OUT
  // --------------------------------------------------

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSuccess("Signed out successfully.");
  }

  // --------------------------------------------------
  // AUTH MODAL
  // --------------------------------------------------

  function openAuth(mode) {
    clearMessages();
    setAuthMode(mode);
    setPassword("");
  }

  function closeAuth() {
    setAuthMode(null);
    setUsername("");
    setPassword("");
  }

  // --------------------------------------------------
  // FILTER VIDEOS
  // --------------------------------------------------

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesCategory =
        category === "All" || video.category === category;

      const text =
        `${video.title} ${video.channel}`.toLowerCase();

      const matchesSearch =
        text.includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [videos, category, search]);

  // --------------------------------------------------
  // CREATE / UPLOAD VIDEO
  // --------------------------------------------------

  async function handleCreateVideo(e) {
    e.preventDefault();

    clearMessages();

    if (!user) {
      setShowCreate(false);
      openAuth("signin");
      return;
    }

    if (!videoTitle.trim()) {
      setError("Please enter a video title.");
      return;
    }

    if (!videoFile) {
      setError("Please choose a video file.");
      return;
    }

    // Supabase Free Storage limit
    if (videoFile.size > 50 * 1024 * 1024) {
      setError("Video must be 50 MB or smaller on the Supabase Free plan.");
      return;
    }

    setBusy(true);

    const safeName = videoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const filePath =
      `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(filePath, videoFile);

    setBusy(false);

    if (uploadError) {
      setError(
        "Video upload failed: " + uploadError.message
      );
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("videos")
      .getPublicUrl(filePath);

    const newVideo = {
      id: crypto.randomUUID(),
      title: videoTitle,
      channel:
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        "LASAR User",
      views: "0 views",
      time: "just now",
      duration: "Video",
      category: "All",
      image:
        "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=900&q=80",
      videoUrl: publicUrl,
      ownerId: user.id,
    };

    setVideos((oldVideos) => [newVideo, ...oldVideos]);

    setVideoTitle("");
    setVideoFile(null);
    setShowCreate(false);

    setSuccess(
      "Video uploaded successfully!"
    );
  }

  // --------------------------------------------------
  // DELETE VIDEO
  // --------------------------------------------------

  async function handleDeleteVideo(video) {
    if (!user) return;

    if (video.ownerId !== user.id) {
      setError("You can only delete your own videos.");
      return;
    }

    if (!video.videoUrl) {
      setVideos((old) =>
        old.filter((item) => item.id !== video.id)
      );
      return;
    }

    try {
      const url = new URL(video.videoUrl);
      const marker = "/storage/v1/object/public/videos/";

      const index = url.pathname.indexOf(marker);

      if (index !== -1) {
        const path = decodeURIComponent(
          url.pathname.substring(index + marker.length)
        );

        const { error: deleteError } =
          await supabase.storage
            .from("videos")
            .remove([path]);

        if (deleteError) {
          setError(deleteError.message);
          return;
        }
      }

      setVideos((old) =>
        old.filter((item) => item.id !== video.id)
      );

      setSuccess("Video deleted.");
    } catch {
      setError("Unable to delete this video.");
    }
  }

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">A</div>
        <h2>LASAR</h2>
        <p>Loading...</p>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN APP
  // --------------------------------------------------

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="logo">
          <div className="logo-a">A</div>
          <strong>LASAR</strong>
        </div>

        <button className="side-item active">
          <span>⌂</span>
          Home
        </button>

        <button className="side-item">
          <span>▶</span>
          Trending
        </button>

        <button className="side-item">
          <span>♟</span>
          Subscriptions
        </button>

        <div className="side-line" />

        <button className="side-item">
          <span>▣</span>
          Library
        </button>

        <button className="side-item">
          <span>◷</span>
          History
        </button>

        <button className="side-item">
          <span>▸</span>
          Liked videos
        </button>

        <div className="side-title">EXPLORE</div>

        <button className="side-item">
          <span>♫</span>
          Music
        </button>

        <button className="side-item">
          <span>🎮</span>
          Gaming
        </button>

        <button className="side-item">
          <span>🎬</span>
          Movies
        </button>

        <button className="side-item">
          <span>▤</span>
          Learning
        </button>

      </aside>

      {/* MAIN */}
      <main className="main">

        {/* TOP BAR */}
        <header className="topbar">

          <div className="mobile-logo">
            <div className="logo-a">A</div>
            <strong>LASAR</strong>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <button>⌕</button>
          </div>

          <div className="top-actions">

            {user ? (
              <div className="user-area">

                <button
                  className="create-button"
                  onClick={() => {
                    clearMessages();
                    setShowCreate(true);
                  }}
                >
                  + Create
                </button>

                <div className="avatar">
                  {(
                    user.user_metadata?.username ||
                    user.email ||
                    "A"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <button
                  className="logout-button"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>

              </div>
            ) : (
              <button
                className="signin-button"
                onClick={() => openAuth("signin")}
              >
                Sign in
              </button>
            )}

          </div>

        </header>

        {/* CATEGORIES */}
        <div className="categories">
          {categories.map((item) => (
            <button
              key={item}
              className={
                category === item
                  ? "category active"
                  : "category"
              }
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {/* MESSAGE */}
        {success && (
          <div className="success-message">
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {/* WELCOME */}
        <section className="welcome">

          <div>
            <div className="welcome-a">A</div>

            <div>
              <h1>
                {user
                  ? `Welcome, ${
                      user.user_metadata?.username ||
                      user.email?.split("@")[0] ||
                      "User"
                    }`
                  : "Welcome to LASAR"}
              </h1>

              <p>
                Watch, create and share videos.
              </p>
            </div>
          </div>

          {user ? (
            <button
              className="welcome-button"
              onClick={() => setShowCreate(true)}
            >
              Create a video
            </button>
          ) : (
            <button
              className="welcome-button"
              onClick={() => openAuth("signup")}
            >
              Create an account
            </button>
          )}

        </section>

        {/* VIDEO HEADER */}
        <div className="video-header">

          <h2>Recommended videos</h2>

          <select defaultValue="relevance">
            <option value="relevance">
              Sort Relevance
            </option>
            <option value="recent">
              Most Recent
            </option>
            <option value="popular">
              Most Popular
            </option>
          </select>

        </div>

        {/* VIDEOS */}
        {filteredVideos.length > 0 ? (
          <div className="video-grid">

            {filteredVideos.map((video) => (

              <div
                className="video-card"
                key={video.id}
              >

                <div className="thumbnail">

                  <img
                    src={video.image}
                    alt={video.title}
                  />

                  <span className="duration">
                    {video.duration}
                  </span>

                </div>

                <div className="video-info">

                  <div className="channel-avatar">
                    {video.channel
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div style={{ flex: 1 }}>

                    <h3>{video.title}</h3>

                    <p>{video.channel}</p>

                    <small>
                      {video.views} • {video.time}
                    </small>

                    {user &&
                      video.ownerId === user.id && (
                        <button
                          onClick={() =>
                            handleDeleteVideo(video)
                          }
                          style={{
                            marginTop: "8px",
                            border: 0,
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "5px 9px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      )}

                  </div>

                </div>

              </div>

            ))}

          </div>
        ) : (
          <div className="no-results">
            <h3>No videos found</h3>
            <p>Try another search or category.</p>
          </div>
        )}

      </main>

      {/* AUTH MODAL */}
      {authMode && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeAuth();
            }
          }}
        >

          <div className="modal">

            <button
              className="close"
              onClick={closeAuth}
            >
              ×
            </button>

            <div className="modal-logo">
              <div className="logo-a">A</div>
              <strong>LASAR</strong>
            </div>

            {authMode === "signin" ? (
              <>
                <h2>Sign in</h2>

                <p className="modal-subtitle">
                  Sign in to your LASAR account
                </p>

                {error && (
                  <div className="form-error">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="form-success">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSignIn}>

                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    autoComplete="email"
                  />

                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                  />

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Signing in..." : "Sign in"}
                  </button>

                </form>

                <button
                  className="link-button"
                  onClick={handleForgotPassword}
                  disabled={busy}
                >
                  Forgot password?
                </button>

                <p className="switch-text">
                  Don't have an account?

                  <button
                    onClick={() => {
                      clearMessages();
                      setAuthMode("signup");
                    }}
                  >
                    Create account
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2>Create account</h2>

                <p className="modal-subtitle">
                  Create your free LASAR account
                </p>

                {error && (
                  <div className="form-error">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="form-success">
                    {success}
                  </div>
                )}

                <form onSubmit={handleCreateAccount}>

                  <input
                    type="text"
                    placeholder="Your name"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    autoComplete="name"
                  />

                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    autoComplete="email"
                  />

                  <input
                    type="password"
                    placeholder="Password (minimum 6 characters)"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="new-password"
                  />

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={busy}
                  >
                    {busy
                      ? "Creating account..."
                      : "Create account"}
                  </button>

                </form>

                <p className="switch-text">
                  Already have an account?

                  <button
                    onClick={() => {
                      clearMessages();
                      setAuthMode("signin");
                    }}
                  >
                    Sign in
                  </button>
                </p>
              </>
            )}

          </div>
        </div>
      )}

      {/* CREATE VIDEO MODAL */}
      {showCreate && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
            }
          }}
        >

          <div className="modal">

            <button
              className="close"
              onClick={() => setShowCreate(false)}
            >
              ×
            </button>

            <div className="modal-logo">
              <div className="logo-a">A</div>
              <strong>LASAR</strong>
            </div>

            <h2>Create video</h2>

            <p className="modal-subtitle">
              Upload a video to LASAR
            </p>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateVideo}>

              <input
                type="text"
                placeholder="Video title"
                value={videoTitle}
                onChange={(e) =>
                  setVideoTitle(e.target.value)
                }
              />

              <div className="upload-box">

                <div className="upload-icon">
                  ↑
                </div>

                <h3>
                  Choose your video
                </h3>

                <p>
                  Maximum 50 MB
                </p>

                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    setVideoFile(
                      e.target.files?.[0] || null
                    )
                  }
                />

                {videoFile && (
                  <p>
                    Selected: {videoFile.name}
                  </p>
                )}

              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={busy}
              >
                {busy
                  ? "Uploading..."
                  : "Create video"}
              </button>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;