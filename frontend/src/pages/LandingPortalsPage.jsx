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
        'Relational Recipe Builder & Ingredient Manager',
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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-12">
      
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-extrabold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Multi-Portal Food Ecosystem
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          ChefHub <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 bg-clip-text text-transparent">Multi-Portal</span> Ecosystem
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
          Four dedicated product portals connecting foodies with local independent chefs, ghost kitchens, delivery drivers, and platform administration.
        </p>
      </div>

      {/* 4 Dedicated Portal Sites Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {portalCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.role}
              className={`glass-card ${card.portalClass} rounded-3xl p-7 flex flex-col justify-between space-y-6 relative overflow-hidden group shadow-xl transition-all`}
            >
              
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${card.color} text-white font-black shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border ${card.badgeColor}`}>
                    {card.role} PORTAL
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

                {/* Features List */}
                <div className="space-y-2.5 pt-3 border-t border-slate-300 dark:border-slate-800/60">
                  {card.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visit Button */}
              <div className="pt-4 border-t border-slate-300 dark:border-slate-800/60">
                <button
                  onClick={() => navigate(card.loginPath)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-orange-500/20"
                >
                  <span>Visit {card.title}</span>
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
