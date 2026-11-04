import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ChefHat, Bike, ShieldAlert, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPortalsPage() {
  const navigate = useNavigate();

  const portalCards = [
    {
      role: 'CUSTOMER',
      title: 'Customer Marketplace Site',
      urlPath: '/',
      loginPath: '/customer/login',
      icon: ShoppingBag,
      color: 'from-amber-500 to-orange-600',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      portalClass: 'portal-card-customer',
      description: 'Explore local ghost kitchens, browse artisanal menus, order handcrafted dishes, and track real-time delivery progress.',
      features: [
        'Browse Nearby Independent Chefs & Ghost Kitchens',
        'Customizable Add-ons & Ingredient Preference Modals',
        'Live Timestamped Delivery Tracking Timeline Log',
        'Customer Ratings & Verified Feedback'
      ]
    },
    {
      role: 'VENDOR',
      title: 'Chef Kitchen Console Site',
      urlPath: '/chef/dashboard',
      loginPath: '/chef/login',
      icon: ChefHat,
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      portalClass: 'portal-card-vendor',
      description: 'Real-time kitchen order board, recipe inventory management, and automatic ingredient stock tracking.',
      features: [
        'Kitchen Display System (KDS) Order Management',
        'Artisanal Recipe Builder & Ingredient Manager',
        'Automatic Inventory Deduction on Order Acceptance',
        'Low Stock Alerts & Reorder Level Trackers'
      ]
    },
    {
      role: 'RIDER',
      title: 'Rider Fleet Console Site',
      urlPath: '/rider/dashboard',
      loginPath: '/rider/login',
      icon: Bike,
      color: 'from-sky-500 to-blue-600',
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      portalClass: 'portal-card-rider',
      description: 'Driver shift management, delivery job pickup queue, live GPS coordinates simulator, and instant payout earnings.',
      features: [
        'Online / Offline Shift Status Toggle',
        'Available Pickup Jobs Queue & Map Simulator',
        'Order Delivery Progression Updater',
        'Automated Payout Ledger (10% Delivery Share)'
      ]
    },
    {
      role: 'ADMIN',
      title: 'Admin Control Master Site',
      urlPath: '/admin/dashboard',
      loginPath: '/admin/login',
      icon: ShieldAlert,
      color: 'from-rose-500 to-red-600',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      portalClass: 'portal-card-admin',
      description: 'Master management console for user accounts, platform financial splits, system audit logs, and security settings.',
      features: [
        'Master Platform User Management & Account Controls',
        'Global System Users Table & Ban/Unban Controls',
        'Platform Financial Commission Split Controls (85/10/5)',
        'Admin Username & Security Settings Management'
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 sm:py-10 space-y-10">
      <section className="relative overflow-hidden rounded-[32px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-white to-amber-500/10 dark:from-orange-500/10 dark:via-slate-950 dark:to-sky-500/10 p-6 sm:p-8 lg:p-10 shadow-[0_30px_80px_-35px_rgba(249,115,22,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),transparent_30%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-extrabold uppercase tracking-[0.18em] backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              ChefHub ecosystem
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.06em] text-slate-900 dark:text-white leading-[0.95]">
                Order smarter.
                <span className="block bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Run kitchens better.
                </span>
              </h1>
              <p className="max-w-xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                One platform for food lovers, independent chefs, delivery riders, and admins — built for fast local food commerce and real-time operational visibility.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => navigate('/marketplace')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition-transform hover:-translate-y-0.5"
              >
                Explore marketplace
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/customer/login')}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:text-orange-400"
              >
                Sign in
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
              {[
                ['4', 'Portal views'],
                ['2.4k', 'Orders tracked'],
                ['99.9%', 'Live uptime']
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="text-xl font-black text-slate-900 dark:text-white">{value}</div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[28px] border border-white/30 bg-slate-950/90 p-4 shadow-2xl shadow-slate-950/30">
              <div className="rounded-[22px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Live operations</div>
                    <div className="text-lg font-bold text-white">ChefHub Pulse</div>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300">ONLINE</div>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Orders ready', value: '18', tone: 'text-emerald-300', bar: 'w-4/5 bg-emerald-400' },
                    { label: 'Riders active', value: '11', tone: 'text-sky-300', bar: 'w-3/5 bg-sky-400' },
                    { label: 'Payouts processed', value: '₹24.6k', tone: 'text-orange-300', bar: 'w-2/3 bg-orange-400' }
                  ].map(item => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between text-sm text-slate-200">
                        <span>{item.label}</span>
                        <span className={`font-black ${item.tone}`}>{item.value}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${item.bar}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {portalCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.role}
              className={`glass-card ${card.portalClass} rounded-[30px] p-7 flex flex-col justify-between space-y-6 relative overflow-hidden group shadow-xl transition-all`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${card.color} text-white font-black shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border ${card.badgeColor}`}>
                    {card.role} portal
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-300 dark:border-slate-800/60">
                  {card.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-300 dark:border-slate-800/60">
                <button
                  onClick={() => navigate(card.loginPath)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-orange-500/20"
                >
                  <span>Open {card.role.toLowerCase()} portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
