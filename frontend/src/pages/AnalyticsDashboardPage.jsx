import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Heart,
  MessageCircle,
  Eye,
  Activity,
  RefreshCw,
} from "lucide-react";
import { analyticsAPI } from "@/api/services";

const RANGE_OPTIONS = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
];

const compactNumber = (value) => new Intl.NumberFormat("en", { notation: "compact" }).format(value || 0);

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

function MetricCard({ title, value, subtitle, icon: Icon, tone = "blue" }) {
  const toneClass = {
    blue: "from-sky-100 to-sky-50 text-sky-600",
    emerald: "from-emerald-100 to-emerald-50 text-emerald-600",
    orange: "from-orange-100 to-orange-50 text-orange-600",
    rose: "from-rose-100 to-rose-50 text-rose-600",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-ig-border bg-white dark:bg-ig-dark p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-ig-gray">{title}</p>
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${toneClass} grid place-items-center`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-ig-dark">{value}</p>
      <p className="text-xs text-ig-gray mt-1">{subtitle}</p>
    </motion.div>
  );
}

function SparkLine({ labels, series, color = "#0095f6" }) {
  const width = 900;
  const height = 220;
  const padding = 24;

  const points = useMemo(() => {
    if (!series?.length) return "";

    const maxVal = Math.max(...series, 1);
    const minVal = Math.min(...series, 0);
    const spread = maxVal - minVal || 1;

    return series
      .map((val, idx) => {
        const x = padding + (idx * (width - padding * 2)) / Math.max(series.length - 1, 1);
        const y = height - padding - ((val - minVal) / spread) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [series]);

  const total = series?.reduce((sum, n) => sum + n, 0) || 0;

  return (
    <div className="rounded-2xl border border-ig-border bg-white dark:bg-ig-dark p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-ig-dark">Growth Trend</p>
        <p className="text-xs text-ig-gray">Total: {compactNumber(total)}</p>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[540px] h-[220px]">
          <defs>
            <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" />
          <polyline
            fill="url(#lineFill)"
            stroke="none"
            points={`${points} ${width - padding},${height - padding} ${padding},${height - padding}`}
          />
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-ig-gray">
        <span>{labels?.[0] || "-"}</span>
        <span>{labels?.[labels.length - 1] || "-"}</span>
      </div>
    </div>
  );
}

function GroupedBars({ labels, firstSeries, secondSeries, firstLabel, secondLabel }) {
  const rows = labels.map((label, idx) => ({
    label,
    first: firstSeries[idx] || 0,
    second: secondSeries[idx] || 0,
  }));

  const maxVal = Math.max(
    ...rows.flatMap((row) => [row.first, row.second]),
    1
  );

  return (
    <div className="rounded-2xl border border-ig-border bg-white dark:bg-ig-dark p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-ig-dark">Engagement Dynamics</p>
        <div className="flex items-center gap-3 text-xs text-ig-gray">
          <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{firstLabel}</div>
          <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{secondLabel}</div>
        </div>
      </div>

      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[92px_1fr] gap-2 items-center">
            <span className="text-[11px] text-ig-gray">{row.label.slice(5)}</span>
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-rose-100 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${(row.first / maxVal) * 100}%` }}
                />
              </div>
              <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(row.second / maxVal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CohortTable({ cohorts }) {
  return (
    <div className="rounded-2xl border border-ig-border bg-white dark:bg-ig-dark p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-ig-dark">Cohort Retention</p>
        <p className="text-xs text-ig-gray">Last 12 weeks</p>
      </div>

      {cohorts?.length ? (
        <div className="space-y-2">
          {cohorts.map((row) => (
            <div key={row.cohort} className="rounded-xl border border-ig-border p-3">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="font-medium text-ig-dark">{row.cohort}</span>
                <span className="text-ig-gray">{formatPercent(row.retentionRate)} retained</span>
              </div>
              <div className="h-2 rounded-full bg-sky-100 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${Math.min(row.retentionRate || 0, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-ig-gray">
                <span>Size: {row.size}</span>
                <span>Active: {row.activeUsers}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ig-gray">No cohort data yet. Get more followers to unlock cohort trends.</p>
      )}
    </div>
  );
}

function TopContentSection({ insights }) {
  const topPosts = insights?.topContent?.posts || [];
  const topReels = insights?.topContent?.reels || [];

  return (
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-ig-border bg-white dark:bg-ig-dark p-4 shadow-sm">
        <h2 className="text-sm font-medium text-ig-dark mb-3">Top Posts</h2>
        {topPosts.length ? (
          <div className="space-y-3">
            {topPosts.map((item, idx) => (
              <div key={item.id} className="rounded-xl border border-ig-border p-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-ig-dark">#{idx + 1} Post</span>
                  <span className="text-ig-gray">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-2 text-center">
                    <p className="text-ig-gray">Likes</p>
                    <p className="font-semibold text-rose-600">{compactNumber(item.likes)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-center">
                    <p className="text-ig-gray">Comments</p>
                    <p className="font-semibold text-amber-600">{compactNumber(item.comments)}</p>
                  </div>
                  <div className="rounded-lg bg-sky-50 border border-sky-100 p-2 text-center">
                    <p className="text-ig-gray">Score</p>
                    <p className="font-semibold text-sky-600">{compactNumber(item.score)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ig-gray">Publish more posts to unlock top-post insights.</p>
        )}
      </div>

      <div className="rounded-2xl border border-ig-border bg-white dark:bg-ig-dark p-4 shadow-sm">
        <h2 className="text-sm font-medium text-ig-dark mb-3">Top Reels</h2>
        {topReels.length ? (
          <div className="space-y-3">
            {topReels.map((item, idx) => (
              <div key={item.id} className="rounded-xl border border-ig-border p-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-ig-dark">#{idx + 1} Reel</span>
                  <span className="text-ig-gray">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-2 text-center">
                    <p className="text-ig-gray">Likes</p>
                    <p className="font-semibold text-rose-600">{compactNumber(item.likes)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-center">
                    <p className="text-ig-gray">Comments</p>
                    <p className="font-semibold text-amber-600">{compactNumber(item.comments)}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-2 text-center">
                    <p className="text-ig-gray">Views</p>
                    <p className="font-semibold text-indigo-600">{compactNumber(item.views)}</p>
                  </div>
                  <div className="rounded-lg bg-sky-50 border border-sky-100 p-2 text-center">
                    <p className="text-ig-gray">Score</p>
                    <p className="font-semibold text-sky-600">{compactNumber(item.score)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ig-gray">Publish reels to unlock top-reel insights.</p>
        )}
      </div>
    </section>
  );
}

export default function AnalyticsDashboardPage() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data } = await analyticsAPI.getDashboard(days);
      setAnalytics(data.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6 xl:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-slate-200 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, idx) => <div key={idx} className="h-28 bg-slate-200 rounded-2xl" />)}
          </div>
          <div className="h-72 bg-slate-200 rounded-2xl" />
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const labels = analytics?.growth?.labels || [];
  const combinedGrowth = labels.map((_, idx) => {
    const followers = analytics?.growth?.followersGained?.[idx] || 0;
    const posts = analytics?.growth?.postsCreated?.[idx] || 0;
    const reels = analytics?.growth?.reelsCreated?.[idx] || 0;
    return followers + posts + reels;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 xl:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-ig-dark">Creator Dashboard</h1>
          <p className="text-sm text-ig-gray mt-1">Instagram-style growth, engagement, retention and personal creator insights.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-ig-border bg-white dark:bg-ig-dark p-1 flex items-center gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  days === opt.value ? "bg-ig-dark text-white" : "text-ig-gray hover:bg-ig-hover"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchAnalytics(true)}
            className="h-10 w-10 rounded-xl border border-ig-border bg-white dark:bg-ig-dark hover:bg-ig-hover grid place-items-center"
            title="Refresh analytics"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-xl border border-ig-border bg-white dark:bg-ig-dark px-4 py-2 text-xs">
        <span className="text-ig-gray">Generated at: {new Date(analytics?.generatedAt).toLocaleString()}</span>
        <span className={`font-medium ${analytics?.cache?.hit ? "text-emerald-600" : "text-amber-600"}`}>
          Cache: {analytics?.cache?.hit ? "HIT" : "MISS"} ({analytics?.cache?.ttlSeconds || 0}s TTL)
        </span>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Followers"
          value={compactNumber(analytics?.overview?.followers)}
          subtitle="Audience base"
          icon={Users}
          tone="blue"
        />
        <MetricCard
          title="Engagement Rate"
          value={formatPercent(analytics?.engagement?.engagementRate)}
          subtitle={`Last ${analytics?.rangeDays} days`}
          icon={Activity}
          tone="emerald"
        />
        <MetricCard
          title="Retention Rate"
          value={formatPercent(analytics?.retention?.retentionRate)}
          subtitle="Returning audience"
          icon={Heart}
          tone="rose"
        />
        <MetricCard
          title="Avg Interactions"
          value={compactNumber(analytics?.personalInsights?.avgInteractionsPerContent)}
          subtitle="Per content item"
          icon={Eye}
          tone="orange"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <SparkLine labels={labels} series={combinedGrowth} />
        </div>
        <div className="rounded-2xl border border-ig-border bg-white dark:bg-ig-dark p-4 shadow-sm">
          <p className="text-sm font-medium text-ig-dark mb-3">Retention Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-ig-gray">Current engaged users</span><span>{analytics?.retention?.currentEngagedUsers || 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-ig-gray">Previous engaged users</span><span>{analytics?.retention?.previousEngagedUsers || 0}</span></div>
            <div className="flex items-center justify-between"><span className="text-ig-gray">Returning users</span><span>{analytics?.retention?.returningUsers || 0}</span></div>
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 border border-emerald-100">
              <p className="text-xs text-emerald-700">Retention Rate</p>
              <p className="text-2xl font-semibold text-emerald-700">{formatPercent(analytics?.retention?.retentionRate)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <GroupedBars
          labels={analytics?.engagement?.labels || []}
          firstSeries={analytics?.engagement?.likesReceived || []}
          secondSeries={analytics?.engagement?.commentsReceived || []}
          firstLabel="Likes"
          secondLabel="Comments"
        />
        <CohortTable cohorts={analytics?.cohorts || []} />
      </section>

      <section className="rounded-2xl border border-ig-border bg-white dark:bg-ig-dark p-4 shadow-sm mb-6">
        <h2 className="text-sm font-medium text-ig-dark mb-4">Personal Insights</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-xl border border-ig-border p-3">
            <p className="text-xs text-ig-gray">Followers gained</p>
            <p className="text-xl font-semibold text-ig-dark mt-1">{compactNumber(analytics?.personalInsights?.followersGainedTotal)}</p>
            <p className="text-[11px] text-ig-gray mt-1">In selected range</p>
          </div>
          <div className="rounded-xl border border-ig-border p-3">
            <p className="text-xs text-ig-gray">Best publishing day</p>
            <p className="text-xl font-semibold text-ig-dark mt-1">{analytics?.personalInsights?.bestPublishingDay?.day || "-"}</p>
            <p className="text-[11px] text-ig-gray mt-1">{analytics?.personalInsights?.bestPublishingDay?.publishedCount || 0} uploads</p>
          </div>
          <div className="rounded-xl border border-ig-border p-3">
            <p className="text-xs text-ig-gray">Publishing consistency</p>
            <p className="text-xl font-semibold text-ig-dark mt-1">{formatPercent(analytics?.personalInsights?.publishingConsistencyRate)}</p>
            <p className="text-[11px] text-ig-gray mt-1">{analytics?.personalInsights?.activePublishingDays || 0} active days</p>
          </div>
          <div className="rounded-xl border border-ig-border p-3">
            <p className="text-xs text-ig-gray">Content mix</p>
            <p className="text-xl font-semibold text-ig-dark mt-1">
              {compactNumber(analytics?.personalInsights?.contentMix?.posts)}P / {compactNumber(analytics?.personalInsights?.contentMix?.reels)}R
            </p>
            <p className="text-[11px] text-ig-gray mt-1">Posts vs reels published</p>
          </div>
        </div>
      </section>

      <TopContentSection insights={analytics?.personalInsights} />
    </div>
  );
}
