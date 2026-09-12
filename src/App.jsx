import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const BLOCKED_CONTENT =
  /\b(porn|porno|pornography|xxx|nsfw|nude|nudity|sex|sexual|explicit|hentai|onlyfans|adult-content|erotic|fetish|rape|bestiality)\b/i;


/* =========================================================
   HELPERS
========================================================= */

function getChannelName(user, fallback = "LASAR Channel") {
  return (
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    fallback
  );
}

function formatDate(date) {
  if (!date) return "";

  const diff = Date.now() - new Date(date).getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 7) return `${days} days ago`;

  return new Date(date).toLocaleDateString();
}

async function sha256Hex(file) {
  const buffer = await file.arrayBuffer();

  const hash = await crypto.subtle.digest(
    "SHA-256",
    buffer
  );

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}


/* =========================================================
   ICONS
========================================================= */

function Icon({ name, size = 22, stroke = 2 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "icon",
  };

  const paths = {
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),

    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),

    shorts: (
      <>
        <path d="M9 3h6l6 10.5a3 3 0 0 1-2.6 4.5H11l-6-10.5A3 3 0 0 1 7.6 3H9Z" />
        <path d="m10 8 5 3-5 3V8Z" />
      </>
    ),

    subscriptions: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m10 9 5 3-5 3V9Z" />
      </>
    ),

    trending: (
      <path d="M12 21c4 0 7-2.8 7-6.5 0-3.1-1.8-5.4-4.2-7.7.1 2.2-.7 3.5-2 4.3.2-4.2-2-6.8-4.8-8.1.4 3.1-2 5.4-2 8.5C6 17.8 8.5 21 12 21Z" />
    ),

    music: (
      <>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </>
    ),

    gaming: (
      <>
        <path d="M7 8h10a4 4 0 0 1 3.8 5l-1.2 4a2.5 2.5 0 0 1-4.5.6L14 16H10l-1.1 1.6a2.5 2.5 0 0 1-4.5-.6l-1.2-4A4 4 0 0 1 7 8Z" />
        <path d="M7 11v4" />
        <path d="M5 13h4" />
        <circle
          cx="16.5"
          cy="12.5"
          r=".7"
          fill="currentColor"
        />
        <circle
          cx="18.5"
          cy="14.5"
          r=".7"
          fill="currentColor"
        />
      </>
    ),

    library: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </>
    ),

    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    like: (
      <>
        <path d="M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Z" />
        <path d="M7 20h9.3a2 2 0 0 0 1.9-1.4l2-6A2 2 0 0 0 18.3 10H14l.6-3.2A2.4 2.4 0 0 0 12.2 4L7 10" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.5v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4v-2.5h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V4h2.5v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.5h-.1a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
        <path d="M8 21h8" />
      </>
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    play: <path d="m9 6 10 6-10 6V6Z" />,

    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),

    more: (
      <>
        <circle
          cx="5"
          cy="12"
          r="1"
          fill="currentColor"
        />
        <circle
          cx="12"
          cy="12"
          r="1"
          fill="currentColor"
        />
        <circle
          cx="19"
          cy="12"
          r="1"
          fill="currentColor"
        />
      </>
    ),

    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M6 7l1 14h10l1-14" />
        <path d="M9 7V4h6v3" />
      </>
    ),

    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),

    channel: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    check: <path d="m5 12 4 4L19 6" />,

    shield: (
      <>
        <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.play}</svg>;
}


/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [videos, setVideos] = useState([]);
  const [likes, setLikes] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [history, setHistory] = useState([]);

  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  const [signedUrls, setSignedUrls] = useState({});

  const [showUpload, setShowUpload] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [readNotificationIds, setReadNotificationIds] =
    useState(() => {
      try {
        return (
          JSON.parse(
            localStorage.getItem(
              "lasar_read_notifications"
            )
          ) || []
        );
      } catch {
        return [];
      }
    });

  const [authMode, setAuthMode] = useState("signin");

  const [message, setMessage] = useState("");

  const [settings, setSettings] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem("lasar_settings")
        ) || {
          autoplay: true,
          dataSaver: false,
          captions: false,
        }
      );
    } catch {
      return {
        autoplay: true,
        dataSaver: false,
        captions: false,
      };
    }
  });


  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (event === "PASSWORD_RECOVERY") {
          setAuthMode("reset");
          setShowAuth(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);


  /* =======================================================
     STORAGE
  ======================================================= */

  function getStoragePath(video) {
    if (video?.storage_path) {
      return video.storage_path;
    }

    const marker =
      "/storage/v1/object/public/videos/";

    const url = video?.video_url || "";

    const index = url.indexOf(marker);

    if (index >= 0) {
      return decodeURIComponent(
        url.slice(index + marker.length)
      );
    }

    return "";
  }


  async function getSignedUrl(video) {
    const path = getStoragePath(video);

    if (!path) return "";

    const { data, error } =
      await supabase.storage
        .from("videos")
        .createSignedUrl(path, 3600);

    if (error) {
      console.error(
        "Signed URL error:",
        error
      );

      return "";
    }

    return data?.signedUrl || "";
  }


  async function refreshSignedUrls(videoList) {
    const validVideos = videoList.filter(
      (video) => getStoragePath(video)
    );

    if (!validVideos.length) {
      setSignedUrls({});
      return;
    }

    const paths = validVideos.map(
      getStoragePath
    );

    const { data, error } =
      await supabase.storage
        .from("videos")
        .createSignedUrls(paths, 3600);

    if (error) {
      console.error(
        "Signed URL error:",
        error
      );

      return;
    }

    const next = {};

    (data || []).forEach((item) => {
      if (!item.path || !item.signedUrl) return;

      const video = validVideos.find(
        (v) => getStoragePath(v) === item.path
      );

      if (video) {
        next[video.id] = item.signedUrl;
      }
    });

    setSignedUrls(next);
  }


  /* =======================================================
     LOAD VIDEOS
  ======================================================= */

  async function loadVideos() {
    const { data, error } =
      await supabase
        .from("videos")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Load videos error:",
        error
      );

      setMessage(
        "Could not load videos. Check your Supabase policies."
      );

      return;
    }

    const list = data || [];

    setVideos(list);

    refreshSignedUrls(list);
  }


  /* =======================================================
     USER DATA
  ======================================================= */

  async function loadUserData(userId) {
    if (!userId) {
      setLikes([]);
      setSubscriptions([]);
      setHistory([]);
      return;
    }

    const [
      likesResult,
      subscriptionsResult,
      historyResult,
    ] = await Promise.all([
      supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", userId),

      supabase
        .from("subscriptions")
        .select("channel_id")
        .eq("subscriber_id", userId),

      supabase
        .from("watch_history")
        .select("video_id, watched_at")
        .eq("user_id", userId)
        .order("watched_at", {
          ascending: false,
        }),
    ]);

    setLikes(
      (likesResult.data || []).map(
        (item) => item.video_id
      )
    );

    setSubscriptions(
      (subscriptionsResult.data || []).map(
        (item) => item.channel_id
      )
    );

    setHistory(
      historyResult.data || []
    );
  }


  useEffect(() => {
    loadVideos();

    loadUserData(
      session?.user?.id || null
    );
  }, [session?.user?.id]);


  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const notifications = useMemo(() => {
    if (!session) return [];

    const items = [];

    /*
      Because Supabase RLS controls which rows the user can
      see, pending notifications are safe here:
      normal users see their own pending uploads,
      admin sees the moderation queue.
    */

    videos
      .filter(
        (video) =>
          video.owner_id === session.user.id &&
          (
            video.moderation_status ===
              "approved" ||
            video.moderation_status ===
              "rejected"
          )
      )
      .slice(0, 20)
      .forEach((video) => {
        const approved =
          video.moderation_status ===
          "approved";

        const stamp =
          video.moderation_checked_at ||
          video.approved_at ||
          video.created_at;

        items.push({
          id:
            `moderation-${video.id}-` +
            `${video.moderation_status}-` +
            `${stamp || ""}`,

          icon: approved
            ? "check"
            : "close",

          title: approved
            ? "Your video was approved"
            : "Your video was rejected",

          text: approved
            ? `“${
                video.title ||
                "Untitled video"
              }” is now available on LASAR.`
            : `“${
                video.title ||
                "Untitled video"
              }” was rejected${
                video.moderation_reason
                  ? `: ${video.moderation_reason}`
                  : "."
              }`,

          time: stamp,

          video,
        });
      });


    videos
      .filter(
        (video) =>
          video.moderation_status ===
          "pending"
      )
      .slice(0, 20)
      .forEach((video) => {
        items.push({
          id:
            `pending-${video.id}-` +
            `${video.created_at || ""}`,

          icon: "shield",

          title:
            "Video waiting for moderation",

          text:
            `${video.channel_name || "A creator"} ` +
            `uploaded “${
              video.title ||
              "Untitled video"
            }”.`,

          time: video.created_at,

          admin: true,

          video,
        });
      });


    return items
      .sort(
        (a, b) =>
          new Date(b.time || 0) -
          new Date(a.time || 0)
      )
      .slice(0, 30);
  }, [session, videos]);


  const unreadNotifications =
    notifications.filter(
      (item) =>
        !readNotificationIds.includes(
          item.id
        )
    );


  function markNotificationsRead(ids) {
    setReadNotificationIds((old) => {
      const next = Array.from(
        new Set([
          ...old,
          ...ids,
        ])
      ).slice(-200);

      localStorage.setItem(
        "lasar_read_notifications",
        JSON.stringify(next)
      );

      return next;
    });
  }


  function openNotification(item) {
    markNotificationsRead([
      item.id,
    ]);

    setShowNotifications(false);

    if (item.admin) {
      navigate("admin");
      return;
    }

    if (item.video) {
      openVideo(item.video);
    }
  }


  /* =======================================================
     SETTINGS
  ======================================================= */

  function updateSetting(name) {
    setSettings((old) => {
      const next = {
        ...old,
        [name]: !old[name],
      };

      localStorage.setItem(
        "lasar_settings",
        JSON.stringify(next)
      );

      return next;
    });
  }


  /* =======================================================
     FILTER VIDEOS
  ======================================================= */

  const filteredVideos = useMemo(() => {
    /*
      Only approved videos are shown in normal video pages.
      This prevents pending videos from appearing publicly.
    */

    let result = videos.filter(
      (video) =>
        video.moderation_status ===
        "approved"
    );


    if (page === "shorts") {
      result = result.filter(
        (video) => video.is_short
      );
    }


    if (page === "music") {
      result = result.filter(
        (video) =>
          video.category?.toLowerCase() ===
          "music"
      );
    }


    if (page === "gaming") {
      result = result.filter(
        (video) =>
          video.category?.toLowerCase() ===
          "gaming"
      );
    }


    if (page === "trending") {
      result.sort(
        (a, b) =>
          Number(b.views || 0) -
          Number(a.views || 0)
      );
    }


    if (page === "subscriptions") {
      result = result.filter(
        (video) =>
          subscriptions.includes(
            video.owner_id
          )
      );
    }


    if (page === "liked") {
      result = result.filter(
        (video) =>
          likes.includes(video.id)
      );
    }


    if (page === "history") {
      const ids = history.map(
        (item) => item.video_id
      );

      result = ids
        .map((id) =>
          videos.find(
            (video) =>
              video.id === id &&
              video.moderation_status ===
                "approved"
          )
        )
        .filter(Boolean);
    }


    if (category !== "All") {
      result = result.filter(
        (video) =>
          video.category?.toLowerCase() ===
          category.toLowerCase()
      );
    }


    const query =
      search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (video) =>
          video.title
            ?.toLowerCase()
            .includes(query) ||

          video.channel_name
            ?.toLowerCase()
            .includes(query) ||

          video.description
            ?.toLowerCase()
            .includes(query) ||

          video.category
            ?.toLowerCase()
            .includes(query)
      );
    }


    return result;
  }, [
    videos,
    page,
    category,
    search,
    subscriptions,
    likes,
    history,
  ]);


  /* =======================================================
     LIKE
  ======================================================= */

  async function toggleLike(video) {
    if (!session) {
      setAuthMode("signin");
      setShowAuth(true);
      return;
    }

    const liked =
      likes.includes(video.id);


    if (liked) {
      const { error } =
        await supabase
          .from("video_likes")
          .delete()
          .eq(
            "user_id",
            session.user.id
          )
          .eq(
            "video_id",
            video.id
          );

      if (error) {
        setMessage(error.message);
        return;
      }

      setLikes((old) =>
        old.filter(
          (id) => id !== video.id
        )
      );

      return;
    }


    const { error } =
      await supabase
        .from("video_likes")
        .insert({
          user_id:
            session.user.id,

          video_id:
            video.id,
        });


    if (error) {
      setMessage(error.message);
      return;
    }


    setLikes((old) => [
      ...old,
      video.id,
    ]);
  }


  /* =======================================================
     SUBSCRIBE
  ======================================================= */

  async function toggleSubscribe(
    channelId
  ) {
    if (!session) {
      setAuthMode("signin");
      setShowAuth(true);
      return;
    }

    if (
      channelId ===
      session.user.id
    ) {
      return;
    }

    const subscribed =
      subscriptions.includes(
        channelId
      );


    if (subscribed) {
      const { error } =
        await supabase
          .from("subscriptions")
          .delete()
          .eq(
            "subscriber_id",
            session.user.id
          )
          .eq(
            "channel_id",
            channelId
          );

      if (error) {
        setMessage(error.message);
        return;
      }

      setSubscriptions((old) =>
        old.filter(
          (id) =>
            id !== channelId
        )
      );

      return;
    }


    const { error } =
      await supabase
        .from("subscriptions")
        .insert({
          subscriber_id:
            session.user.id,

          channel_id:
            channelId,
        });


    if (error) {
      setMessage(error.message);
      return;
    }


    setSubscriptions((old) => [
      ...old,
      channelId,
    ]);
  }


  /* =======================================================
     OPEN VIDEO
  ======================================================= */

  async function openVideo(video) {
    const url =
      signedUrls[video.id] ||
      (await getSignedUrl(video));


    setSelectedVideo({
      ...video,
      signedUrl: url,
    });


    if (!session) return;


    await supabase
      .from("watch_history")
      .upsert(
        {
          user_id:
            session.user.id,

          video_id:
            video.id,

          watched_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,video_id",
        }
      );


    loadUserData(
      session.user.id
    );
  }


  /* =======================================================
     DELETE VIDEO
  ======================================================= */

  async function deleteVideo(video) {
    if (!session) return;


    const isOwner =
      video.owner_id ===
      session.user.id;


    /*
      Owner deletion is allowed directly.
      Admin deletion is protected by Supabase RLS.
      If someone is not the owner, ask for confirmation
      and let the database policy make the final decision.
    */

    if (!isOwner) {
      const confirmed =
        window.confirm(
          "This action requires administrator permission. Continue?"
        );

      if (!confirmed) return;
    } else {
      const confirmed =
        window.confirm(
          `Delete "${video.title}" permanently?`
        );

      if (!confirmed) return;
    }


    setMessage(
      "Deleting video..."
    );


    const storagePath =
      getStoragePath(video);


    if (storagePath) {
      const { error } =
        await supabase.storage
          .from("videos")
          .remove([
            storagePath,
          ]);

      if (error) {
        console.error(
          "Storage delete error:",
          error
        );

        setMessage(
          `Could not delete video file: ${error.message}`
        );

        return;
      }
    }


    const { error: dbError } =
      await supabase
        .from("videos")
        .delete()
        .eq("id", video.id);


    if (dbError) {
      console.error(
        "Database delete error:",
        dbError
      );

      setMessage(
        dbError.message
      );

      return;
    }


    setVideos((old) =>
      old.filter(
        (item) =>
          item.id !== video.id
      )
    );


    setSignedUrls((old) => {
      const next = {
        ...old,
      };

      delete next[video.id];

      return next;
    });


    if (
      selectedVideo?.id ===
      video.id
    ) {
      setSelectedVideo(null);
    }


    setMessage(
      "Video deleted successfully."
    );
  }


  /* =======================================================
     ADMIN MODERATION
  ======================================================= */

  async function moderateVideo(
    video,
    status
  ) {
    if (!session) {
      setMessage(
        "Please sign in first."
      );

      return;
    }


    let reason = null;


    if (
      status === "rejected"
    ) {
      reason =
        window.prompt(
          "Enter the reason for rejecting this video:"
        ) ||
        "Rejected by LASAR administrator.";
    }


    const now =
      new Date().toISOString();


    const updateData = {
      moderation_status:
        status,

      moderation_reason:
        reason,

      moderation_checked_at:
        now,

      approved_at:
        status === "approved"
          ? now
          : null,
    };


    const { error } =
      await supabase
        .from("videos")
        .update(updateData)
        .eq("id", video.id);


    if (error) {
      console.error(
        "Moderation error:",
        error
      );

      setMessage(
        `Could not ${status} this video: ${error.message}`
      );

      return;
    }


    setVideos((old) =>
      old.map((item) =>
        item.id === video.id
          ? {
              ...item,
              ...updateData,
            }
          : item
      )
    );


    setMessage(
      status === "approved"
        ? "Video approved and published."
        : "Video rejected."
    );
  }


  /* =======================================================
     NAVIGATION
  ======================================================= */

  function navigate(target) {
    setPage(target);
    setCategory("All");
    setSearch("");
    setSelectedChannel(null);
    setShowMobileMenu(false);
  }


  function openChannel(ownerId) {
    setSelectedChannel(ownerId);
    setPage("channel");
    setSearch("");
    setCategory("All");
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <span>A</span>
        </div>

        <strong>LASAR</strong>

        <p>Loading...</p>
      </div>
    );
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="app">

      {/* TOP BAR */}

      <header className="topbar">

        <div className="top-left">

          <button
            className="icon-button menu-button"
            onClick={() =>
              setShowMobileMenu(
                (value) => !value
              )
            }
          >
            <Icon name="menu" />
          </button>


          <button
            className="brand"
            onClick={() =>
              navigate("home")
            }
          >
            <span className="brand-logo">
              L
            </span>

            <span className="brand-name">
              LASAR
            </span>
          </button>

        </div>


        {/* SEARCH */}

        <div className="search-area">

          <div className="search-box">

            <Icon
              name="search"
              size={20}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search videos and channels"
            />

            {search && (
              <button
                className="search-clear"
                onClick={() =>
                  setSearch("")
                }
              >
                <Icon
                  name="close"
                  size={18}
                />
              </button>
            )}

          </div>


          <button
            className="search-button"
          >
            <Icon
              name="search"
              size={21}
            />
          </button>


          <button
            className="mic-button"
            title="Voice search"
          >
            <Icon
              name="mic"
              size={20}
            />
          </button>

        </div>


        {/* TOP ACTIONS */}

        <div className="top-actions">

          <button
            className="create-button"
            onClick={() => {
              if (!session) {
                setAuthMode(
                  "signin"
                );

                setShowAuth(true);
              } else {
                setShowUpload(true);
              }
            }}
          >
            <Icon
              name="plus"
              size={20}
            />

            <span>Create</span>
          </button>


          <div
            style={{
              position:
                "relative",
            }}
          >

            <button
              className="icon-button notification-button"
              onClick={() => {
                if (!session) {
                  setAuthMode(
                    "signin"
                  );

                  setShowAuth(true);

                  return;
                }

                setShowNotifications(
                  (old) => !old
                );
              }}
              aria-label="Notifications"
              title="Notifications"
            >

              <Icon name="bell" />

              {session &&
                unreadNotifications.length >
                  0 && (
                  <span className="notification-dot" />
                )}

            </button>


            {session &&
              showNotifications && (
                <NotificationPanel
                  notifications={
                    notifications
                  }
                  readIds={
                    readNotificationIds
                  }
                  onOpen={
                    openNotification
                  }
                  onMarkAllRead={() =>
                    markNotificationsRead(
                      notifications.map(
                        (item) =>
                          item.id
                      )
                    )
                  }
                />
              )}

          </div>


          {session ? (

            <button
              className="profile-avatar"
              onClick={() => {
                setSelectedChannel(
                  session.user.id
                );

                setPage("channel");
              }}
            >
              {getChannelName(
                session.user
              )
                .charAt(0)
                .toUpperCase()}
            </button>

          ) : (

            <button
              className="signin-top"
              onClick={() => {
                setAuthMode(
                  "signin"
                );

                setShowAuth(true);
              }}
            >
              <Icon
                name="user"
                size={19}
              />

              Sign in
            </button>

          )}

        </div>

      </header>


      {/* SIDEBAR */}

      <aside
        className={`sidebar ${
          showMobileMenu
            ? "open"
            : ""
        }`}
      >

        <SidebarItem
          icon="home"
          text="Home"
          active={
            page === "home"
          }
          onClick={() =>
            navigate("home")
          }
        />

        <SidebarItem
          icon="shorts"
          text="Shorts"
          active={
            page === "shorts"
          }
          onClick={() =>
            navigate("shorts")
          }
        />

        <SidebarItem
          icon="subscriptions"
          text="Subscriptions"
          active={
            page ===
            "subscriptions"
          }
          onClick={() =>
            navigate(
              "subscriptions"
            )
          }
        />


        <div className="sidebar-line" />

        <div className="sidebar-heading">
          You
        </div>


        <SidebarItem
          icon="channel"
          text="Your channel"
          active={
            page === "channel" &&
            selectedChannel ===
              session?.user?.id
          }
          onClick={() => {
            if (!session) {
              setAuthMode(
                "signin"
              );

              setShowAuth(true);

              return;
            }

            setSelectedChannel(
              session.user.id
            );

            setPage("channel");
          }}
        />


        <SidebarItem
          icon="history"
          text="History"
          active={
            page === "history"
          }
          onClick={() =>
            navigate("history")
          }
        />


        <SidebarItem
          icon="library"
          text="Playlists"
          active={
            page === "library"
          }
          onClick={() =>
            navigate("library")
          }
        />


        <SidebarItem
          icon="like"
          text="Liked videos"
          active={
            page === "liked"
          }
          onClick={() =>
            navigate("liked")
          }
        />


        <div className="sidebar-line" />

        <div className="sidebar-heading">
          Explore
        </div>


        <SidebarItem
          icon="trending"
          text="Trending"
          active={
            page === "trending"
          }
          onClick={() =>
            navigate("trending")
          }
        />


        <SidebarItem
          icon="music"
          text="Music"
          active={
            page === "music"
          }
          onClick={() =>
            navigate("music")
          }
        />


        <SidebarItem
          icon="gaming"
          text="Gaming"
          active={
            page === "gaming"
          }
          onClick={() =>
            navigate("gaming")
          }
        />


        {session && (
          <>
            <div className="sidebar-line" />

            <div className="sidebar-heading">
              Admin
            </div>

            <SidebarItem
              icon="shield"
              text="Moderation"
              active={
                page === "admin"
              }
              onClick={() =>
                navigate("admin")
              }
            />
          </>
        )}


        <div className="sidebar-line" />


        <SidebarItem
          icon="settings"
          text="Settings"
          active={
            page === "settings"
          }
          onClick={() =>
            navigate("settings")
          }
        />


        <div className="sidebar-footer">
          <span>LASAR</span>

          <span>
            Watch. Create. Share.
          </span>

          <small>
            LASAR version 2.0
          </small>
        </div>

      </aside>


      {/* MAIN */}

      <main className="main">

        {page !== "settings" &&
          page !== "channel" &&
          page !== "admin" && (

            <div className="category-bar">

              {[
                "All",
                "Music",
                "Gaming",
                "Movies",
                "Learning",
                "Technology",
                "Shorts",
              ].map((item) => (

                <button
                  key={item}
                  className={`category-chip ${
                    category === item
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => {
                    setCategory(
                      item
                    );

                    setPage(
                      item === "Shorts"
                        ? "shorts"
                        : "home"
                    );
                  }}
                >
                  {item}
                </button>

              ))}

            </div>

          )}


        {message && (
          <div className="app-message">
            {message}
          </div>
        )}


        {/* HOME */}

        {page === "home" &&
          !search.trim() && (

            <HomeHero
              session={session}
              onCreate={() => {
                if (!session) {
                  setAuthMode(
                    "signin"
                  );

                  setShowAuth(true);
                } else {
                  setShowUpload(true);
                }
              }}
            />

          )}


        {/* CHANNEL */}

        {page === "channel" && (

          <ChannelPage
            ownerId={
              selectedChannel ||
              session?.user?.id
            }

            videos={videos}

            session={session}

            signedUrls={
              signedUrls
            }

            likes={likes}

            subscriptions={
              subscriptions
            }

            onLike={
              toggleLike
            }

            onSubscribe={
              toggleSubscribe
            }

            onVideo={
              openVideo
            }

            onChannel={
              openChannel
            }

            onDelete={
              deleteVideo
            }
          />

        )}


        {/* SETTINGS */}

        {page === "settings" && (

          <SettingsPage
            session={session}
            settings={settings}
            updateSetting={
              updateSetting
            }
            onSignOut={async () => {
              await supabase.auth.signOut();

              navigate("home");
            }}
          />

        )}


        {/* PLAYLISTS */}

        {page === "library" && (

          <SimplePage
            title="Playlists"
            icon="library"
            description="Your saved LASAR videos and playlists."
            emptyTitle="No playlists yet"
            emptyText="Your playlists will appear here."
          />

        )}


        {/* ADMIN */}

        {page === "admin" && (

          <AdminModerationPage
            session={session}
            videos={videos}
            signedUrls={
              signedUrls
            }

            onApprove={(video) =>
              moderateVideo(
                video,
                "approved"
              )
            }

            onReject={(video) =>
              moderateVideo(
                video,
                "rejected"
              )
            }

            onDelete={
              deleteVideo
            }

            onVideo={
              openVideo
            }
          />

        )}


        {/* VIDEO PAGES */}

        {![
          "settings",
          "channel",
          "library",
          "admin",
        ].includes(page) && (

          <VideoSection
            title={
              search.trim()
                ? "Search results"
                : page === "shorts"
                ? "Shorts"
                : page ===
                  "subscriptions"
                ? "Subscriptions"
                : page ===
                  "trending"
                ? "Trending videos"
                : page === "music"
                ? "Music"
                : page === "gaming"
                ? "Gaming"
                : page === "history"
                ? "Watch history"
                : page === "liked"
                ? "Liked videos"
                : "Recommended videos"
            }

            videos={
              filteredVideos
            }

            session={session}

            likes={likes}

            subscriptions={
              subscriptions
            }

            signedUrls={
              signedUrls
            }

            onLike={
              toggleLike
            }

            onSubscribe={
              toggleSubscribe
            }

            onVideo={
              openVideo
            }

            onChannel={
              openChannel
            }

            onDelete={
              deleteVideo
            }

            emptyTitle={
              search.trim()
                ? "No videos found"
                : page ===
                  "subscriptions"
                ? "No subscription videos yet"
                : page === "history"
                ? "Your watch history is empty"
                : page === "liked"
                ? "You haven't liked any videos yet"
                : page === "shorts"
                ? "No Shorts yet"
                : "No videos yet"
            }

            emptyText={
              search.trim()
                ? "Try another search."
                : "When an approved video is available, it will appear here."
            }
          />

        )}

      </main>


      {/* MOBILE NAV */}

      <nav className="mobile-nav">

        <MobileNavItem
          icon="home"
          label="Home"
          active={
            page === "home"
          }
          onClick={() =>
            navigate("home")
          }
        />

        <MobileNavItem
          icon="shorts"
          label="Shorts"
          active={
            page === "shorts"
          }
          onClick={() =>
            navigate("shorts")
          }
        />


        <button
          className="mobile-create"
          onClick={() => {
            if (!session) {
              setAuthMode(
                "signin"
              );

              setShowAuth(true);
            } else {
              setShowUpload(true);
            }
          }}
        >
          <span>
            <Icon
              name="plus"
              size={25}
            />
          </span>
        </button>


        <MobileNavItem
          icon="subscriptions"
          label="Subs"
          active={
            page ===
            "subscriptions"
          }
          onClick={() =>
            navigate(
              "subscriptions"
            )
          }
        />


        <MobileNavItem
          icon="library"
          label="You"
          active={
            page === "library" ||
            page === "channel"
          }
          onClick={() =>
            navigate("library")
          }
        />

      </nav>


      {/* VIDEO PLAYER */}

      {selectedVideo && (

        <VideoPlayer
          video={
            selectedVideo
          }

          session={session}

          liked={likes.includes(
            selectedVideo.id
          )}

          subscribed={subscriptions.includes(
            selectedVideo.owner_id
          )}

          onLike={() =>
            toggleLike(
              selectedVideo
            )
          }

          onSubscribe={() =>
            toggleSubscribe(
              selectedVideo.owner_id
            )
          }

          onDelete={() =>
            deleteVideo(
              selectedVideo
            )
          }

          onClose={() =>
            setSelectedVideo(null)
          }

          videoUrl={
            selectedVideo.signedUrl ||
            signedUrls[
              selectedVideo.id
            ] ||
            ""
          }

          autoplay={
            settings.autoplay
          }

          captions={
            settings.captions
          }
        />

      )}


      {/* UPLOAD */}

      {showUpload && (

        <UploadModal
          session={session}

          onClose={() =>
            setShowUpload(false)
          }

          onUploaded={async () => {
            await loadVideos();

            setShowUpload(false);

            setPage("home");

            setMessage(
              "Video uploaded successfully. It is waiting for moderation."
            );
          }}
        />

      )}


      {/* AUTH */}

      {showAuth && (

        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() =>
            setShowAuth(false)
          }
        />

      )}


      {showMobileMenu && (
        <div
          className="mobile-backdrop"
          onClick={() =>
            setShowMobileMenu(false)
          }
        />
      )}

    </div>
  );
}


/* =========================================================
   SIDEBAR ITEM
========================================================= */

function SidebarItem({
  icon,
  text,
  active,
  onClick,
}) {
  return (
    <button
      className={`sidebar-item ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <Icon
        name={icon}
        size={21}
      />

      <span>{text}</span>
    </button>
  );
}


/* =========================================================
   MOBILE NAV ITEM
========================================================= */

function MobileNavItem({
  icon,
  label,
  active,
  onClick,
}) {
  return (
    <button
      className={`mobile-nav-item ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <Icon
        name={icon}
        size={21}
      />

      <span>{label}</span>
    </button>
  );
}


/* =========================================================
   HOME HERO
========================================================= */

function HomeHero({
  session,
  onCreate,
}) {
  return (
    <section className="home-welcome">

      <div className="welcome-content">

        <div className="welcome-avatar">
          {session
            ? getChannelName(
                session.user
              )
                .charAt(0)
                .toUpperCase()
            : "A"}
        </div>

        <div>

          <h1>
            Welcome
            {session
              ? `, ${getChannelName(
                  session.user
                )}`
              : ""}
          </h1>

          <p>
            Watch, create and share
            videos on LASAR.
          </p>

        </div>

      </div>


      <button
        className="welcome-create"
        onClick={onCreate}
      >
        <Icon
          name="plus"
          size={18}
        />

        Create a video
      </button>

    </section>
  );
}


/* =========================================================
   VIDEO SECTION
========================================================= */

function VideoSection({
  title,
  videos,
  session,
  likes,
  subscriptions,
  onLike,
  onSubscribe,
  onVideo,
  onChannel,
  onDelete,
  signedUrls = {},
  emptyTitle,
  emptyText,
}) {
  return (
    <section className="video-section">

      <div className="section-heading">

        <h2>{title}</h2>

        {videos.length > 0 && (
          <span>
            {videos.length} videos
          </span>
        )}

      </div>


      {videos.length === 0 ? (

        <EmptyState
          icon="play"
          title={emptyTitle}
          text={emptyText}
          signedIn={!!session}
        />

      ) : (

        <div className="video-grid">

          {videos.map((video) => (

            <VideoCard
              key={video.id}
              video={video}
              session={session}
              liked={likes.includes(
                video.id
              )}
              subscribed={subscriptions.includes(
                video.owner_id
              )}
              onLike={onLike}
              onSubscribe={
                onSubscribe
              }
              onVideo={onVideo}
              onChannel={
                onChannel
              }
              onDelete={
                onDelete
              }
              videoUrl={
                signedUrls[
                  video.id
                ] || ""
              }
            />

          ))}

        </div>

      )}

    </section>
  );
}


/* =========================================================
   VIDEO CARD
========================================================= */

function VideoCard({
  video,
  session,
  liked,
  subscribed,
  onLike,
  onSubscribe,
  onVideo,
  onChannel,
  onDelete,
  videoUrl,
}) {
  const [
    showMenu,
    setShowMenu,
  ] = useState(false);

  return (
    <article className="video-card">

      <button
        className={`thumbnail-button ${
          video.is_short
            ? "short-thumbnail"
            : ""
        }`}
        onClick={() =>
          onVideo(video)
        }
      >

        {videoUrl ? (

          <video
            src={videoUrl}
            muted
            preload="metadata"
            className="thumbnail-video"
          />

        ) : (

          <div className="thumbnail-placeholder">
            <Icon
              name="play"
              size={35}
            />
          </div>

        )}


        <span className="thumbnail-play">
          <Icon
            name="play"
            size={25}
          />
        </span>


        {video.is_short && (
          <span className="short-label">
            SHORTS
          </span>
        )}

      </button>


      <div className="video-details">

        <button
          className="channel-avatar-small"
          onClick={() =>
            onChannel(
              video.owner_id
            )
          }
        >
          {(video.channel_name ||
            "L")
            .charAt(0)
            .toUpperCase()}
        </button>


        <div className="video-text">

          <button
            className="video-title"
            onClick={() =>
              onVideo(video)
            }
          >
            {video.title}
          </button>


          <button
            className="video-channel"
            onClick={() =>
              onChannel(
                video.owner_id
              )
            }
          >
            {video.channel_name ||
              "LASAR Channel"}
          </button>


          <div className="video-meta">

            <span>
              {Number(
                video.views || 0
              ).toLocaleString()}{" "}
              views
            </span>

            <span>•</span>

            <span>
              {formatDate(
                video.created_at
              )}
            </span>

          </div>


          <div className="card-actions">

            <button
              className={`small-action ${
                liked
                  ? "liked"
                  : ""
              }`}
              onClick={() =>
                onLike(video)
              }
            >
              <Icon
                name="like"
                size={16}
              />

              {liked
                ? "Liked"
                : "Like"}
            </button>


            {session &&
              video.owner_id !==
                session.user.id && (

                <button
                  className={`small-action ${
                    subscribed
                      ? "subscribed"
                      : ""
                  }`}
                  onClick={() =>
                    onSubscribe(
                      video.owner_id
                    )
                  }
                >
                  <Icon
                    name="bell"
                    size={15}
                  />

                  {subscribed
                    ? "Subscribed"
                    : "Subscribe"}
                </button>

              )}


            <div className="more-container">

              <button
                className="more-button"
                onClick={() =>
                  setShowMenu(
                    (value) =>
                      !value
                  )
                }
              >
                <Icon
                  name="more"
                  size={20}
                />
              </button>


              {showMenu && (

                <div className="video-menu">

                  <button
                    onClick={() =>
                      onVideo(video)
                    }
                  >
                    <Icon
                      name="play"
                      size={17}
                    />

                    Watch
                  </button>


                  {session && (
                    <button
                      className="delete-menu"
                      onClick={() => {
                        setShowMenu(
                          false
                        );

                        onDelete(
                          video
                        );
                      }}
                    >
                      <Icon
                        name="trash"
                        size={17}
                      />

                      Delete
                    </button>
                  )}

                </div>

              )}

            </div>

          </div>

        </div>

      </div>

    </article>
  );
}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon,
  title,
  text,
  signedIn,
}) {
  return (
    <div className="empty-state">

      <div className="empty-icon">
        <Icon
          name={icon}
          size={35}
        />
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      {!signedIn && (
        <p className="empty-note">
          Sign in to upload and
          interact with videos.
        </p>
      )}

    </div>
  );
}


/* =========================================================
   VIDEO PLAYER
========================================================= */

function VideoPlayer({
  video,
  session,
  liked,
  subscribed,
  onLike,
  onSubscribe,
  onDelete,
  onClose,
  autoplay,
  captions,
  videoUrl,
}) {
  const videoRef =
    useRef(null);


  useEffect(() => {
    if (
      videoRef.current &&
      autoplay
    ) {
      videoRef.current
        .play()
        .catch(() => {});
    }
  }, [
    video,
    autoplay,
  ]);


  return (
    <div
      className="player-overlay"
      onClick={onClose}
    >

      <div
        className={`player-modal ${
          video.is_short
            ? "short-player"
            : ""
        }`}
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="player-top">

          <button
            className="player-close"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>

          <strong>
            LASAR
          </strong>

        </div>


        <div className="player-video-wrapper">

          {videoUrl ? (

            <video
              ref={videoRef}
              src={videoUrl}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onContextMenu={(e) =>
                e.preventDefault()
              }
              autoPlay={autoplay}
              className="player-video"
            >
              {captions && (
                <track
                  kind="captions"
                  label="Captions"
                  srcLang="en"
                />
              )}
            </video>

          ) : (

            <div
              style={{
                padding: 40,
                textAlign:
                  "center",
              }}
            >
              <Icon
                name="play"
                size={50}
              />

              <p>
                Video could not be
                loaded.
              </p>
            </div>

          )}

        </div>


        <div className="player-info">

          <h2>
            {video.title}
          </h2>


          <div className="player-channel-row">

            <div className="player-channel">

              <span>
                {(video.channel_name ||
                  "L")
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <div>

                <strong>
                  {video.channel_name ||
                    "LASAR Channel"}
                </strong>

                <small>
                  {Number(
                    video.views || 0
                  ).toLocaleString()}{" "}
                  views •{" "}
                  {formatDate(
                    video.created_at
                  )}
                </small>

              </div>

            </div>


            {session &&
              video.owner_id !==
                session.user.id && (

                <button
                  className={`subscribe-large ${
                    subscribed
                      ? "subscribed"
                      : ""
                  }`}
                  onClick={
                    onSubscribe
                  }
                >
                  {subscribed
                    ? "Subscribed"
                    : "Subscribe"}
                </button>

              )}

          </div>


          <div className="player-actions">

            <button
              className={
                liked
                  ? "player-liked"
                  : ""
              }
              onClick={onLike}
            >
              <Icon
                name="like"
                size={20}
              />

              {liked
                ? "Liked"
                : "Like"}
            </button>


            {session && (
              <button
                className="player-delete"
                onClick={
                  onDelete
                }
              >
                <Icon
                  name="trash"
                  size={19}
                />

                Delete
              </button>
            )}

          </div>


          {video.description && (
            <div className="description-box">
              {video.description}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   CHANNEL PAGE
========================================================= */

function ChannelPage({
  ownerId,
  videos,
  session,
  signedUrls,
  likes,
  subscriptions,
  onLike,
  onSubscribe,
  onVideo,
  onChannel,
  onDelete,
}) {
  const channelVideos =
    videos.filter(
      (video) =>
        video.owner_id ===
          ownerId &&
        (
          video.moderation_status ===
            "approved" ||
          session?.user?.id ===
            ownerId
        )
    );


  const channelName =
    channelVideos[0]
      ?.channel_name ||
    (
      session?.user?.id ===
      ownerId
        ? getChannelName(
            session.user
          )
        : "LASAR Channel"
    );


  const isOwn =
    session?.user?.id ===
    ownerId;


  return (
    <section className="channel-page">

      <div className="channel-cover" />


      <div className="channel-header">

        <div className="channel-avatar-large">
          {channelName
            .charAt(0)
            .toUpperCase()}
        </div>


        <div className="channel-info">

          <h1>
            {channelName}
          </h1>

          <p>
            @
            {channelName
              .replace(
                /\s+/g,
                ""
              )
              .toLowerCase()}
          </p>

          <span>
            {channelVideos.length}{" "}
            videos
          </span>

        </div>


        {session &&
          !isOwn && (

            <button
              className={`subscribe-large ${
                subscriptions.includes(
                  ownerId
                )
                  ? "subscribed"
                  : ""
              }`}
              onClick={() =>
                onSubscribe(
                  ownerId
                )
              }
            >
              {subscriptions.includes(
                ownerId
              )
                ? "Subscribed"
                : "Subscribe"}
            </button>

          )}


        {isOwn && (
          <button className="channel-manage">
            Your channel
          </button>
        )}

      </div>


      <div className="channel-tabs">

        <span className="active">
          Videos
        </span>

        <span>
          Shorts
        </span>

        <span>
          About
        </span>

      </div>


      <VideoSection
        title="Videos"
        videos={
          channelVideos
        }
        session={session}
        likes={likes}
        subscriptions={
          subscriptions
        }
        onLike={onLike}
        onSubscribe={
          onSubscribe
        }
        onVideo={onVideo}
        onChannel={
          onChannel
        }
        onDelete={
          onDelete
        }
        signedUrls={
          signedUrls
        }
        emptyTitle="No videos"
        emptyText={
          isOwn
            ? "Upload your first video to your channel."
            : "This channel has not uploaded any videos yet."
        }
      />

    </section>
  );
}


/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage({
  session,
  settings,
  updateSetting,
  onSignOut,
}) {
  return (
    <section className="settings-page">

      <div className="settings-title">

        <Icon
          name="settings"
          size={25}
        />

        <div>

          <h1>
            Settings
          </h1>

          <p>
            Control your LASAR
            experience.
          </p>

        </div>

      </div>


      <div className="settings-card">

        <h2>
          Video and audio
          preferences
        </h2>


        <SettingRow
          icon="play"
          title="Autoplay"
          text="Automatically play videos when opened."
          checked={
            settings.autoplay
          }
          onClick={() =>
            updateSetting(
              "autoplay"
            )
          }
        />


        <SettingRow
          icon="settings"
          title="Data saving"
          text="Use less data while watching videos."
          checked={
            settings.dataSaver
          }
          onClick={() =>
            updateSetting(
              "dataSaver"
            )
          }
        />


        <SettingRow
          icon="subscriptions"
          title="Captions"
          text="Show captions when available."
          checked={
            settings.captions
          }
          onClick={() =>
            updateSetting(
              "captions"
            )
          }
        />

      </div>


      <div className="settings-card">

        <h2>
          Account
        </h2>


        {session ? (

          <>

            <div className="account-box">

              <div className="account-avatar">
                {getChannelName(
                  session.user
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>


              <div>

                <strong>
                  {getChannelName(
                    session.user
                  )}
                </strong>

                <span>
                  {session.user.email}
                </span>

              </div>

            </div>


            <button
              className="settings-signout"
              onClick={onSignOut}
            >
              Sign out
            </button>

          </>

        ) : (

          <p>
            You are not signed in.
          </p>

        )}

      </div>

    </section>
  );
}


/* =========================================================
   SETTING ROW
========================================================= */

function SettingRow({
  icon,
  title,
  text,
  checked,
  onClick,
}) {
  return (
    <button
      className="setting-row"
      onClick={onClick}
    >

      <span className="setting-icon">
        <Icon
          name={icon}
          size={20}
        />
      </span>


      <span className="setting-text">

        <strong>
          {title}
        </strong>

        <small>
          {text}
        </small>

      </span>


      <span
        className={`toggle ${
          checked ? "on" : ""
        }`}
      >
        <span />
      </span>

    </button>
  );
}


/* =========================================================
   SIMPLE PAGE
========================================================= */

function SimplePage({
  title,
  icon,
  description,
  emptyTitle,
  emptyText,
}) {
  return (
    <section className="simple-page">

      <div className="page-icon">
        <Icon
          name={icon}
          size={30}
        />
      </div>

      <h1>
        {title}
      </h1>

      <p>
        {description}
      </p>


      <EmptyState
        icon={icon}
        title={emptyTitle}
        text={emptyText}
        signedIn
      />

    </section>
  );
}


/* =========================================================
   NOTIFICATION PANEL
========================================================= */

function NotificationPanel({
  notifications,
  readIds,
  onOpen,
  onMarkAllRead,
}) {
  return (
    <div
      style={{
        position:
          "absolute",

        top:
          "calc(100% + 12px)",

        right: 0,

        width: 360,

        maxWidth:
          "calc(100vw - 24px)",

        maxHeight: 520,

        overflowY:
          "auto",

        background:
          "var(--surface, #fff)",

        color:
          "var(--text, #111)",

        border:
          "1px solid var(--border, #ddd)",

        borderRadius: 16,

        boxShadow:
          "0 14px 40px rgba(0,0,0,.22)",

        zIndex: 1000,
      }}
      onClick={(e) =>
        e.stopPropagation()
      }
    >

      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          padding:
            "16px",

          borderBottom:
            "1px solid var(--border, #ddd)",
        }}
      >

        <strong
          style={{
            fontSize: 18,
          }}
        >
          Notifications
        </strong>


        {notifications.length >
          0 && (

          <button
            type="button"
            onClick={
              onMarkAllRead
            }
            style={{
              border: 0,
              background:
                "transparent",
              cursor:
                "pointer",
              fontSize: 12,
              fontWeight: 700,
              color: "#065fd4",
            }}
          >
            Mark all as read
          </button>

        )}

      </div>


      {notifications.length ===
      0 ? (

        <div
          style={{
            padding: 42,
            textAlign:
              "center",
            opacity: 0.7,
          }}
        >

          <Icon
            name="bell"
            size={34}
          />

          <p>
            No notifications yet.
          </p>

        </div>

      ) : (

        notifications.map(
          (item) => {

            const unread =
              !readIds.includes(
                item.id
              );


            return (
              <button
                type="button"
                key={item.id}
                onClick={() =>
                  onOpen(item)
                }
                style={{
                  width:
                    "100%",

                  display:
                    "flex",

                  gap: 12,

                  alignItems:
                    "flex-start",

                  textAlign:
                    "left",

                  padding:
                    "14px 16px",

                  border: 0,

                  borderBottom:
                    "1px solid #eee",

                  background:
                    unread
                      ? "rgba(25,118,210,.09)"
                      : "transparent",

                  color:
                    "inherit",

                  cursor:
                    "pointer",
                }}
              >

                <span
                  style={{
                    width: 38,
                    height: 38,
                    flex:
                      "0 0 38px",
                    borderRadius:
                      "50%",
                    display:
                      "grid",
                    placeItems:
                      "center",
                    background:
                      "rgba(127,127,127,.14)",
                  }}
                >
                  <Icon
                    name={
                      item.icon
                    }
                    size={19}
                  />
                </span>


                <span
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >

                  <strong
                    style={{
                      display:
                        "block",
                      fontSize:
                        14,
                    }}
                  >
                    {item.title}
                  </strong>


                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        4,
                      fontSize:
                        13,
                      lineHeight:
                        1.4,
                      opacity:
                        0.78,
                    }}
                  >
                    {item.text}
                  </span>


                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        6,
                      opacity:
                        0.6,
                    }}
                  >
                    {formatDate(
                      item.time
                    )}
                  </small>

                </span>


                {unread && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      marginTop: 7,
                      borderRadius:
                        "50%",
                      background:
                        "#ff0000",
                      flex:
                        "0 0 8px",
                    }}
                  />
                )}

              </button>
            );
          }
        )

      )}

    </div>
  );
}


/* =========================================================
   ADMIN MODERATION
========================================================= */

function AdminModerationPage({
  session,
  videos,
  signedUrls,
  onApprove,
  onReject,
  onDelete,
  onVideo,
}) {
  const [
    filter,
    setFilter,
  ] = useState("pending");


  if (!session) {
    return (
      <section
        style={{
          padding: 40,
          textAlign:
            "center",
        }}
      >

        <Icon
          name="shield"
          size={45}
        />

        <h1>
          Sign in required
        </h1>

        <p>
          Sign in to open moderation.
        </p>

      </section>
    );
  }


  const visibleVideos =
    videos.filter(
      (video) =>
        (
          video.moderation_status ||
          "pending"
        ) === filter
    );


  const pendingCount =
    videos.filter(
      (video) =>
        video.moderation_status ===
        "pending"
    ).length;


  const approvedCount =
    videos.filter(
      (video) =>
        video.moderation_status ===
        "approved"
    ).length;


  const rejectedCount =
    videos.filter(
      (video) =>
        video.moderation_status ===
        "rejected"
    ).length;


  return (
    <section
      style={{
        padding:
          "24px 20px 80px",

        maxWidth: 1250,

        margin:
          "0 auto",
      }}
    >

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap: 20,

          flexWrap:
            "wrap",

          marginBottom: 25,
        }}
      >

        <div>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap: 12,
            }}
          >

            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display:
                  "grid",
                placeItems:
                  "center",
                background:
                  "#111827",
                color:
                  "white",
              }}
            >
              <Icon
                name="shield"
                size={25}
              />
            </div>


            <div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                }}
              >
                Admin Moderation
              </h1>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  opacity:
                    0.7,
                }}
              >
                Review and manage LASAR uploads.
              </p>

            </div>

          </div>

        </div>


        <div
          style={{
            padding:
              "12px 16px",

            borderRadius:
              12,

            background:
              "#f3f4f6",
          }}
        >
          <strong>
            {pendingCount}
          </strong>{" "}
          pending review
        </div>

      </div>


      <div
        style={{
          display:
            "flex",

          gap: 10,

          flexWrap:
            "wrap",

          marginBottom:
            25,
        }}
      >

        <AdminFilterButton
          active={
            filter ===
            "pending"
          }
          onClick={() =>
            setFilter(
              "pending"
            )
          }
        >
          Pending ({pendingCount})
        </AdminFilterButton>


        <AdminFilterButton
          active={
            filter ===
            "approved"
          }
          onClick={() =>
            setFilter(
              "approved"
            )
          }
        >
          Approved ({approvedCount})
        </AdminFilterButton>


        <AdminFilterButton
          active={
            filter ===
            "rejected"
          }
          onClick={() =>
            setFilter(
              "rejected"
            )
          }
        >
          Rejected ({rejectedCount})
        </AdminFilterButton>

      </div>


      {visibleVideos.length ===
      0 ? (

        <EmptyState
          icon="check"
          title={`No ${filter} videos`}
          text="New uploads will appear here."
          signedIn
        />

      ) : (

        <div
          style={{
            display:
              "flex",

            flexDirection:
              "column",

            gap: 18,
          }}
        >

          {visibleVideos.map(
            (video) => (

              <AdminVideoCard
                key={video.id}
                video={video}
                videoUrl={
                  signedUrls[
                    video.id
                  ] || ""
                }
                onApprove={
                  onApprove
                }
                onReject={
                  onReject
                }
                onDelete={
                  onDelete
                }
                onVideo={
                  onVideo
                }
              />

            )
          )}

        </div>

      )}

    </section>
  );
}


/* =========================================================
   ADMIN FILTER
========================================================= */

function AdminFilterButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border:
          active
            ? "1px solid #111827"
            : "1px solid #d1d5db",

        background:
          active
            ? "#111827"
            : "white",

        color:
          active
            ? "white"
            : "#111827",

        padding:
          "10px 16px",

        borderRadius: 10,

        cursor:
          "pointer",

        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}


/* =========================================================
   ADMIN VIDEO CARD
========================================================= */

function AdminVideoCard({
  video,
  videoUrl,
  onApprove,
  onReject,
  onDelete,
  onVideo,
}) {
  const status =
    video.moderation_status ||
    "pending";


  return (
    <div
      style={{
        border:
          "1px solid #e5e7eb",

        borderRadius:
          18,

        padding:
          18,

        background:
          "white",

        boxShadow:
          "0 4px 16px rgba(0,0,0,0.05)",
      }}
    >

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "260px 1fr",

          gap: 20,
        }}
      >

        <button
          onClick={() =>
            onVideo(video)
          }
          style={{
            border: 0,
            padding: 0,
            background:
              "#111",

            borderRadius:
              14,

            overflow:
              "hidden",

            minHeight:
              150,

            cursor:
              "pointer",
          }}
        >

          {videoUrl ? (

            <video
              src={videoUrl}
              muted
              preload="metadata"
              style={{
                width:
                  "100%",

                height:
                  180,

                objectFit:
                  video.is_short
                    ? "contain"
                    : "cover",

                background:
                  "#111",
              }}
            />

          ) : (

            <div
              style={{
                height:
                  180,

                display:
                  "grid",

                placeItems:
                  "center",

                color:
                  "white",
              }}
            >
              <Icon
                name="play"
                size={45}
              />
            </div>

          )}

        </button>


        <div>

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              gap: 10,

              alignItems:
                "flex-start",
            }}
          >

            <h2
              style={{
                margin:
                  "0 0 8px",
              }}
            >
              {video.title}
            </h2>


            <span
              style={{
                padding:
                  "5px 10px",

                borderRadius:
                  20,

                fontSize:
                  12,

                fontWeight:
                  700,

                background:
                  status ===
                  "approved"
                    ? "#dcfce7"
                    : status ===
                      "rejected"
                    ? "#fee2e2"
                    : "#fef3c7",
              }}
            >
              {status
                .charAt(0)
                .toUpperCase() +
                status.slice(1)}
            </span>

          </div>


          <p>
            Channel:{" "}
            <strong>
              {video.channel_name ||
                "LASAR Channel"}
            </strong>
          </p>


          <p>
            Category:{" "}
            <strong>
              {video.category ||
                "Other"}
            </strong>
          </p>


          <p>
            Type:{" "}
            <strong>
              {video.is_short
                ? "Short"
                : "Video"}
            </strong>
          </p>


          <p>
            Uploaded:{" "}
            <strong>
              {formatDate(
                video.created_at
              )}
            </strong>
          </p>


          <div
            style={{
              padding: 12,

              borderRadius:
                10,

              background:
                "#f9fafb",
            }}
          >

            <strong>
              Description
            </strong>

            <p>
              {video.description ||
                "No description."}
            </p>

          </div>


          <p>

            <strong>
              Copyright confirmation:
            </strong>{" "}

            {video.copyright_confirmed
              ? "Confirmed"
              : "Not confirmed"}

          </p>


          {video.moderation_reason && (

            <div
              style={{
                padding:
                  10,

                borderRadius:
                  10,

                background:
                  "#fff7ed",
              }}
            >
              <strong>
                Moderation reason:
              </strong>{" "}
              {video.moderation_reason}
            </div>

          )}


          <div
            style={{
              display:
                "flex",

              gap: 10,

              flexWrap:
                "wrap",

              marginTop:
                16,
            }}
          >

            <button
              onClick={() =>
                onVideo(video)
              }
            >
              <Icon
                name="play"
                size={16}
              />{" "}
              Preview
            </button>


            {status ===
              "pending" && (
              <>
                <button
                  onClick={() =>
                    onApprove(
                      video
                    )
                  }
                >
                  <Icon
                    name="check"
                    size={16}
                  />{" "}
                  Approve
                </button>

                <button
                  onClick={() =>
                    onReject(
                      video
                    )
                  }
                >
                  Reject
                </button>
              </>
            )}


            <button
              onClick={() =>
                onDelete(video)
              }
            >
              <Icon
                name="trash"
                size={16}
              />{" "}
              Delete
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   UPLOAD MODAL
========================================================= */

function UploadModal({
  session,
  onClose,
  onUploaded,
}) {
  const [
    type,
    setType,
  ] = useState("video");

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState("Technology");

  const [
    file,
    setFile,
  ] = useState(null);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    copyrightConfirmed,
    setCopyrightConfirmed,
  ] = useState(false);


  async function uploadVideo(e) {
    e.preventDefault();

    setError("");


    if (!session) {
      setError(
        "Please sign in first."
      );

      return;
    }


    if (!title.trim()) {
      setError(
        "Please enter a video title."
      );

      return;
    }


    if (title.trim().length < 3) {
      setError(
        "Title must be at least 3 characters."
      );

      return;
    }


    if (!file) {
      setError(
        "Please select a video file."
      );

      return;
    }


    if (
      !file.type.startsWith(
        "video/"
      )
    ) {
      setError(
        "Please select a video file."
      );

      return;
    }


    if (
      file.size >
      MAX_VIDEO_SIZE
    ) {
      setError(
        "Maximum file size is 50 MB."
      );

      return;
    }


    if (
      description.trim()
        .length < 10
    ) {
      setError(
        "Description must be at least 10 characters."
      );

      return;
    }


    if (
      BLOCKED_CONTENT.test(
        `${title} ${description} ${file.name}`
      )
    ) {
      setError(
        "This content cannot be uploaded to LASAR."
      );

      return;
    }


    if (!copyrightConfirmed) {
      setError(
        "Please confirm that you own the rights to this video."
      );

      return;
    }


    setUploading(true);


    try {

      const contentHash =
        await sha256Hex(
          file
        );


      const {
        data:
          duplicateRows,
        error:
          duplicateError,
      } = await supabase
        .from("videos")
        .select("id")
        .eq(
          "content_hash",
          contentHash
        )
        .limit(1);


      if (duplicateError) {
        console.error(
          "Duplicate check:",
          duplicateError
        );
      }


      if (
        (duplicateRows || [])
          .length > 0
      ) {
        setError(
          "This video already exists on LASAR."
        );

        return;
      }


      const safeName =
        file.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          )
          .toLowerCase();


      const storagePath =
        `${session.user.id}/` +
        `${crypto.randomUUID()}-` +
        `${safeName}`;


      const {
        error:
          uploadError,
      } = await supabase.storage
        .from("videos")
        .upload(
          storagePath,
          file,
          {
            cacheControl:
              "3600",

            upsert:
              false,

            contentType:
              file.type,
          }
        );


      if (uploadError) {
        setError(
          uploadError.message
        );

        return;
      }


      const {
        error:
          insertError,
      } = await supabase
        .from("videos")
        .insert({
          owner_id:
            session.user.id,

          channel_name:
            getChannelName(
              session.user
            ),

          title:
            title.trim(),

          description:
            description.trim(),

          category,

          is_short:
            type === "short",

          storage_path:
            storagePath,

          video_url:
            "",

          views:
            0,

          moderation_status:
            "pending",

          copyright_confirmed:
            true,

          content_hash:
            contentHash,
        });


      if (insertError) {

        await supabase.storage
          .from("videos")
          .remove([
            storagePath,
          ]);

        setError(
          insertError.message
        );

        return;
      }


      onUploaded();

    } catch (uploadException) {

      console.error(
        uploadException
      );

      setError(
        uploadException?.message ||
          "Upload failed."
      );

    } finally {

      setUploading(false);

    }
  }


  return (
    <div className="modal-overlay">

      <div className="upload-modal">

        <div className="modal-header">

          <div>

            <h2>
              Create
            </h2>

            <p>
              Upload a video to your LASAR channel.
            </p>

          </div>


          <button
            onClick={onClose}
            type="button"
          >
            <Icon
              name="close"
            />
          </button>

        </div>


        <div className="upload-tabs">

          <button
            className={
              type === "video"
                ? "active"
                : ""
            }
            onClick={() =>
              setType("video")
            }
            type="button"
          >
            <Icon
              name="upload"
              size={20}
            />

            Video
          </button>


          <button
            className={
              type === "short"
                ? "active"
                : ""
            }
            onClick={() =>
              setType("short")
            }
            type="button"
          >
            <Icon
              name="shorts"
              size={20}
            />

            Short
          </button>

        </div>


        <form
          onSubmit={
            uploadVideo
          }
        >

          <label>

            Video file

            <input
              type="file"
              accept="video/*"
              onChange={(e) =>
                setFile(
                  e.target.files?.[0] ||
                    null
                )
              }
            />

          </label>


          {file && (

            <div className="selected-file">

              <Icon
                name="check"
                size={17}
              />

              {file.name}

            </div>

          )}


          <label>

            Title

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              placeholder="Enter video title"
              maxLength={100}
            />

          </label>


          <label>

            Description

            <textarea
              value={
                description
              }
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Tell viewers about your video"
              rows={4}
            />

          </label>


          <label>

            Category

            <select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
            >

              {[
                "Technology",
                "Music",
                "Gaming",
                "Movies",
                "Learning",
                "Comedy",
                "News",
                "Other",
              ].map(
                (item) => (
                  <option
                    key={item}
                  >
                    {item}
                  </option>
                )
              )}

            </select>

          </label>


          {type ===
            "short" && (

            <div className="short-notice">
              This upload will appear in Shorts.
            </div>

          )}


          <label
            style={{
              display:
                "flex",

              flexDirection:
                "row",

              alignItems:
                "flex-start",

              gap: 10,

              cursor:
                "pointer",

              marginTop:
                14,
            }}
          >

            <input
              type="checkbox"
              checked={
                copyrightConfirmed
              }
              onChange={(e) =>
                setCopyrightConfirmed(
                  e.target.checked
                )
              }
              style={{
                width: 18,
                height: 18,
                marginTop: 2,
              }}
            />


            <span
              style={{
                lineHeight:
                  1.45,
              }}
            >
              I confirm that I own
              the rights to this
              video or have
              permission to upload
              it to LASAR.
            </span>

          </label>


          <div
            style={{
              marginTop: 10,

              padding: 10,

              borderRadius: 8,

              background:
                "#f8fafc",

              fontSize: 13,
            }}
          >
            Your upload will be
            reviewed before it
            becomes visible to
            other users.
          </div>


          {error && (
            <div className="form-error">
              {error}
            </div>
          )}


          <div className="upload-footer">

            <span>
              Maximum file size:
              50 MB
            </span>


            <button
              className="primary-button"
              disabled={
                uploading
              }
              type="submit"
            >
              {uploading
                ? "Uploading..."
                : "Upload"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


/* =========================================================
   AUTH MODAL
========================================================= */

function AuthModal({
  mode,
  setMode,
  onClose,
}) {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    name,
    setName,
  ] = useState("");

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  function changeMode(next) {
    setMode(next);
    setError("");
    setSuccess("");
  }


  async function submit(e) {
    e.preventDefault();

    setBusy(true);
    setError("");
    setSuccess("");


    try {

      /* SIGN UP */

      if (mode === "signup") {

        const cleanEmail =
          email.trim();


        if (!cleanEmail) {
          setError(
            "Please enter your email."
          );

          return;
        }


        if (
          password.length <
          6
        ) {
          setError(
            "Password must be at least 6 characters."
          );

          return;
        }


        const {
          error:
            signUpError,
        } =
          await supabase.auth
            .signUp({
              email:
                cleanEmail,

              password,

              options: {
                data: {
                  display_name:
                    name.trim() ||
                    cleanEmail.split(
                      "@"
                    )[0],
                },
              },
            });


        if (signUpError) {
          setError(
            signUpError.message
          );

          return;
        }


        setSuccess(
          "Account created successfully!"
        );


        setTimeout(
          onClose,
          1000
        );

        return;
      }


      /* SIGN IN */

      if (mode === "signin") {

        const cleanEmail =
          email.trim();


        if (!cleanEmail) {
          setError(
            "Please enter your email."
          );

          return;
        }


        if (!password) {
          setError(
            "Please enter your password."
          );

          return;
        }


        const {
          error:
            signInError,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                cleanEmail,

              password,
            });


        if (signInError) {
          setError(
            signInError.message
          );

          return;
        }


        onClose();

        return;
      }


      /* FORGOT PASSWORD */

      if (mode === "forgot") {

        const cleanEmail =
          email.trim();


        if (!cleanEmail) {
          setError(
            "Please enter your email."
          );

          return;
        }


        const {
          error:
            resetError,
        } =
          await supabase.auth
            .resetPasswordForEmail(
              cleanEmail,
              {
                redirectTo:
                  window.location.origin,
              }
            );


        if (resetError) {
          setError(
            resetError.message
          );

          return;
        }


        setSuccess(
          "Password reset email sent. Open it and tap the reset link."
        );

        return;
      }


      /* RESET PASSWORD */

      if (mode === "reset") {

        if (
          newPassword.length <
          6
        ) {
          setError(
            "New password must be at least 6 characters."
          );

          return;
        }


        if (
          newPassword !==
          confirmPassword
        ) {
          setError(
            "The two passwords do not match."
          );

          return;
        }


        const {
          error:
            updateError,
        } =
          await supabase.auth
            .updateUser({
              password:
                newPassword,
            });


        if (updateError) {
          setError(
            updateError.message
          );

          return;
        }


        setSuccess(
          "Password updated successfully!"
        );


        setTimeout(
          onClose,
          1200
        );
      }

    } finally {

      setBusy(false);

    }
  }


  return (
    <div className="modal-overlay">

      <div className="auth-modal">

        <button
          className="auth-close"
          onClick={onClose}
          type="button"
        >
          <Icon
            name="close"
          />
        </button>


        <div className="auth-logo">
          <span>
            A
          </span>
        </div>


        <h2>

          {mode === "signin"
            ? "Sign in to LASAR"
            : mode === "signup"
            ? "Create your LASAR account"
            : mode === "forgot"
            ? "Reset your password"
            : "Create a new password"}

        </h2>


        <p>

          {mode === "signin"
            ? "Continue watching, creating and sharing."
            : mode === "signup"
            ? "Create a channel and start uploading."
            : mode === "forgot"
            ? "Enter your email to receive a password reset link."
            : "Choose a new password for your LASAR account."}

        </p>


        <form
          onSubmit={submit}
        >

          {mode ===
            "signup" && (

            <label>

              Channel name

              <input
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                placeholder="Your channel name"
              />

            </label>

          )}


          {[
            "signin",
            "signup",
            "forgot",
          ].includes(mode) && (

            <label>

              Email

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="you@example.com"
                required
              />

            </label>

          )}


          {[
            "signin",
            "signup",
          ].includes(mode) && (

            <label>

              Password

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Password"
                minLength={6}
                required
              />

            </label>

          )}


          {mode ===
            "reset" && (

            <>

              <label>

                New password

                <input
                  type="password"
                  value={
                    newPassword
                  }
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter new password"
                  minLength={6}
                  required
                />

              </label>


              <label>

                Confirm new password

                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter new password again"
                  minLength={6}
                  required
                />

              </label>

            </>

          )}


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


          <button
            className="auth-submit"
            disabled={busy}
            type="submit"
          >
            {busy
              ? "Please wait..."
              : mode ===
                "signin"
              ? "Sign in"
              : mode ===
                "signup"
              ? "Create account"
              : mode ===
                "forgot"
              ? "Send reset email"
              : "Create new password"}
          </button>

        </form>


        <div className="auth-links">

          {mode ===
            "signin" && (

            <>
              <button
                type="button"
                onClick={() =>
                  changeMode(
                    "forgot"
                  )
                }
              >
                Forgot password?
              </button>

              <button
                type="button"
                onClick={() =>
                  changeMode(
                    "signup"
                  )
                }
              >
                Create account
              </button>
            </>

          )}


          {mode ===
            "signup" && (

            <button
              type="button"
              onClick={() =>
                changeMode(
                  "signin"
                )
              }
            >
              Sign in
            </button>

          )}


          {mode ===
            "forgot" && (

            <button
              type="button"
              onClick={() =>
                changeMode(
                  "signin"
                )
              }
            >
              Back to sign in
            </button>

          )}


          {mode ===
            "reset" && (

            <button
              type="button"
              onClick={() =>
                changeMode(
                  "signin"
                )
              }
            >
              Back to sign in
            </button>

          )}

        </div>

      </div>

    </div>
  );
}