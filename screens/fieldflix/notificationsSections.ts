/** Copied from `web/src/screens/NotificationsScreen.tsx` SECTIONS. */
export type NotificationIconId =
  | "trophy"
  | "chart"
  | "video"
  | "whistle"
  | "bulb";

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: NotificationIconId;
};

export const NOTIFICATION_SECTIONS: {
  label: string;
  items: NotificationItem[];
}[] = [
  {
    label: "Today",
    items: [
      {
        id: "t1",
        title: "Match Completed",
        description:
          "Your cricket match session has been processed and is ready to view.",
        time: "2 hours ago",
        icon: "trophy",
      },
      {
        id: "t2",
        title: "Performance spike detected",
        description:
          "Your serve speed improved 12% compared to your last five sessions.",
        time: "3 hours ago",
        icon: "chart",
      },
      {
        id: "t3",
        title: "Weekly Summary Ready",
        description:
          "Check your performance insights and new personal bests this week.",
        time: "5 hours ago",
        icon: "chart",
      },
      {
        id: "t4",
        title: "Video Recording Available",
        description: "Your match recording has been successfully uploaded.",
        time: "8 hours ago",
        icon: "video",
      },
      {
        id: "t5",
        title: "Highlight reel generated",
        description: "We clipped your top rallies from today’s padel session.",
        time: "9 hours ago",
        icon: "video",
      },
      {
        id: "t6",
        title: "Coach left feedback",
        description: "Review footwork notes from your last training block.",
        time: "11 hours ago",
        icon: "whistle",
      },
    ],
  },
  {
    label: "Yesterday",
    items: [
      {
        id: "y1",
        title: "Training Goal Achieved",
        description:
          "You reached your target in today's pickleball training session.",
        time: "1 day ago",
        icon: "whistle",
      },
      {
        id: "y2",
        title: "New AI Insight Available",
        description:
          "Get detailed analysis and smart suggestions from your last game.",
        time: "1 day ago",
        icon: "bulb",
      },
      {
        id: "y3",
        title: "Squad match invite",
        description:
          "You’ve been invited to a doubles ladder match this Saturday.",
        time: "1 day ago",
        icon: "trophy",
      },
      {
        id: "y4",
        title: "Stats export ready",
        description: "Your CSV export from last week is ready to download.",
        time: "1 day ago",
        icon: "chart",
      },
    ],
  },
  {
    label: "This week",
    items: [
      {
        id: "w1",
        title: "Monthly recap unlocked",
        description:
          "See trends for shots, distance covered, and session count.",
        time: "3 days ago",
        icon: "chart",
      },
      {
        id: "w2",
        title: "Storage almost full",
        description: "Free up space or upgrade to keep new recordings.",
        time: "4 days ago",
        icon: "video",
      },
      {
        id: "w3",
        title: "Tip: recovery drills",
        description:
          "Short mobility sets after matches can reduce next-day soreness.",
        time: "5 days ago",
        icon: "bulb",
      },
      {
        id: "w4",
        title: "Arena promotion",
        description:
          "Book TSG Sports Arena this week and get 10% off peak slots.",
        time: "5 days ago",
        icon: "trophy",
      },
      {
        id: "w5",
        title: "Drill streak milestone",
        description: "Five coaching drills completed in a row—keep it going.",
        time: "6 days ago",
        icon: "whistle",
      },
    ],
  },
  {
    label: "Earlier",
    items: [
      {
        id: "e1",
        title: "Welcome to Fieldflix",
        description: "Start recording, track progress, and unlock AI insights.",
        time: "2 weeks ago",
        icon: "bulb",
      },
      {
        id: "e2",
        title: "Profile verified",
        description: "Your athlete profile is now verified for league play.",
        time: "3 weeks ago",
        icon: "trophy",
      },
      {
        id: "e3",
        title: "First session synced",
        description:
          "Your wearable data is now connected to session summaries.",
        time: "3 weeks ago",
        icon: "chart",
      },
    ],
  },
];
