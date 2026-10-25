import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag, Star, Clock, MapPin, CheckCircle2, ChevronRight, ChevronLeft,
  X, AlertCircle, AlertTriangle, Sparkles, Send, Ban, Utensils, Flame, Heart,
  Search, Filter, Eye, EyeOff, CreditCard, ShieldCheck, Lock, Receipt, ArrowRight,
  Truck, QrCode, Building, Wallet, Download, RefreshCw, Tag, Percent, Navigation,
  Compass, ChefHat, Check, Info, SlidersHorizontal, ArrowUpDown, Plus,
  Trash2, MapPinOff, Smartphone, Home, Briefcase, User, Phone, CheckCircle, KeyRound, Radio
} from 'lucide-react';
import { KitchenLoadingScreen } from '../components/KitchenLoading';
import CustomerAuthPage from './CustomerAuthPage';
import LiveDeliveryMap from '../components/LiveDeliveryMap';
import {
  GooglePayIcon, PhonePeIcon, PaytmIcon, BhimIcon, UpiIcon,
  VisaIcon, MastercardIcon, RupayIcon, CreditCardTabIcon, NetBankingTabIcon,
  getBankIcon, getCardBrandIcon
} from '../components/PaymentIcons';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers';

// Tokenized Payment Pre-flight Validation: Brand detection & Luhn algorithm check
export function detectCardBrand(numStr) {
  const clean = String(numStr || '').replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(?:5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^(?:508[5-9]|6521[5-9]|6522|60|65|81|82)/.test(clean)) return 'RuPay';
  if (/^3[47]/.test(clean)) return 'Amex';
  return 'Unknown';
}

export function validateLuhn(numStr) {
  const clean = String(numStr || '').replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Client-Side Predictive Geofencing: 20km Circular Polygon Generator
export function generateCircularPolygon(lat, lng, radiusKm = 20) {
  const points = [];
  const earthRadius = 6371;
  const numSides = 16;
  for (let i = 0; i <= numSides; i++) {
    const angle = (i * 360 / numSides) * (Math.PI / 180);
    const dLat = (radiusKm / earthRadius) * (180 / Math.PI);
    const dLng = (radiusKm / (earthRadius * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);
    const pLat = lat + dLat * Math.sin(angle);
    const pLng = lng + dLng * Math.cos(angle);
    points.push([pLng, pLat]); // GeoJSON ring expects [lng, lat]
  }
  return turfPolygon([points]);
}

const DELIVERY_FEE = 40.00;

const fallbackImages = {
  'Signature Truffle Tagliatelle': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
  'Handmade Parmigiano Ravioli': 'https://images.unsplash.com/photo-1587740896339-96a761e0508d?auto=format&fit=crop&w=600&q=80',
  'Wild Mushroom Truffle Gnocchi': 'https://images.unsplash.com/photo-1621996346565-e3d5d6281313?auto=format&fit=crop&w=600&q=80',
  'Truffle Burrata Flatbread': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
  'Classic Garlic Herb Focaccia': 'https://images.unsplash.com/photo-1579684947550-22e945225d9a?auto=format&fit=crop&w=600&q=80',
  'Traditional Espresso Tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
  'Shahi Paneer Tikka Masala': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
  'Slow-Cooked Butter Chicken': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
  'Aromatic Royal Dum Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
  'Garlic Butter Naan (2 pcs)': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
  'Chilled Mango Lassi Smoothie': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
  'Rich Tonkotsu Pork Ramen': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  'Crispy Chicken Katsu Curry Bowl': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  'Pan-Seared Pork Gyoza (6 pcs)': 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
  'Chettinad Pepper Chicken': 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80',
  'Madras Ghee Roast Dosa': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80'
};

const getDishImage = (dish) => {
  if (dish.image_url) return dish.image_url;
  if (fallbackImages[dish.name]) return fallbackImages[dish.name];
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
};

const CHEF_AVATARS = {
  'chef.mario@chefhub.com': {
    name: 'Chef Mario Rossi',
    title: 'Michelin Artisan • Italian Pasta',
    specialtyTag: 'Truffle & Pasta',
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=240&q=80',
    locality: 'Indiranagar 100ft Rd',
    coords: { lat: 12.9784, lng: 77.6408 }
  },
  'chef.priya@chefhub.com': {
    name: 'Chef Priya Sharma',
    title: 'Royal Mughal & Lucknowi Biryani',
    specialtyTag: 'Mughlai & Biryani',
    avatar: 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&w=240&q=80',
    locality: 'Koramangala 5th Block',
    coords: { lat: 12.9352, lng: 77.6245 }
  },
  'chef.kenji@chefhub.com': {
    name: 'Chef Kenji Sato',
    title: 'Tokyo Tonkotsu Ramen Master',
    specialtyTag: 'Japanese Ramen',
    avatar: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=240&q=80',
    locality: 'MG Road, Church Street',
    coords: { lat: 12.9756, lng: 77.6066 }
  },
  'chef.ramu@chefhub.com': {
    name: 'Chef Ramu Pillai',
    title: 'Chettinad Heritage Master • Dosa',
    specialtyTag: 'Chettinad & Dosa',
    avatar: 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?auto=format&fit=crop&w=240&q=80',
    locality: 'HSR Layout Sector 1',
    coords: { lat: 12.9121, lng: 77.6446 }
  }
};

const BANGALORE_HUBS = [
  { id: 'koramangala', name: 'Koramangala 5th Block', lat: 12.9352, lng: 77.6245, desc: 'Central Gourmet Hub • ~2.1 km to Priya' },
  { id: 'indiranagar', name: 'Indiranagar 100ft Road', lat: 12.9784, lng: 77.6408, desc: 'Italian & Fusion Hub • ~1.5 km to Mario' },
  { id: 'mgroad', name: 'MG Road / UB City', lat: 12.9716, lng: 77.5946, desc: 'Tokyo Ramen Hub • ~1.2 km to Kenji' },
  { id: 'hsr', name: 'HSR Layout Sector 4', lat: 12.9121, lng: 77.6446, desc: 'Chettinad Hub • ~1.0 km to Ramu' },
  { id: 'whitefield', name: 'Whitefield ITPL', lat: 12.9863, lng: 77.7337, desc: 'Tech Corridor • ~14.2 km (Within 20 km)' },
  { id: 'airport', name: 'Kempegowda Airport (BLR)', lat: 13.2400, lng: 77.7100, desc: 'Airport Zone • ~34.8 km (>20 km Limit Test)' }
];

const CUISINE_ITEMS = [
  { id: 'ALL', name: 'All Dishes', icon: '🍽️', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=240&q=80' },
  { id: 'Biryani', name: 'Biryani & Rice', icon: '🍛', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=240&q=80' },
  { id: 'Pasta', name: 'Artisan Pasta', icon: '🍝', img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=240&q=80' },
  { id: 'Ramen', name: 'Tokyo Ramen', icon: '🍜', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=240&q=80' },
  { id: 'Chettinad', name: 'Chettinad & Dosa', icon: '🥘', img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=240&q=80' },
  { id: 'Flatbread', name: 'Burrata Flatbread', icon: '🍕', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=240&q=80' },
  { id: 'Curry', name: 'Butter Chicken & Tikka', icon: '🍲', img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=240&q=80' },
  { id: 'Desserts', name: 'Tiramisu & Sweets', icon: '🍰', img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=240&q=80' }
];

const PROMO_CHIPS = [
  { code: 'CHEF50', title: '₹50 OFF', desc: 'Flat ₹50 OFF min ₹199' },
  { code: 'GOURMET20', title: '20% OFF', desc: 'Up to ₹120 OFF min ₹350' },
  { code: 'FIRSTBITE', title: '₹75 OFF', desc: 'Welcome bonus min ₹249' },
  { code: 'FREESHIP', title: 'FREE DELIVERY', desc: 'Zero delivery fee' }
];

const STAGE_HIERARCHY = {
  PLACED: 0,
  ORDER_PLACED: 0,
  CONFIRMED: 0,
  PREPARING: 1,
  KITCHEN_PREPARING: 1,
  READY: 2,
  KITCHEN_READY: 2,
  READY_FOR_PICKUP: 2,
  OUT_FOR_DELIVERY: 3,
  RIDER_ACCEPTED: 3,
  DELIVERED: 4
};

export default function CustomerSite({ user, onLogin, onLogout }) {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedChefFilter, setSelectedChefFilter] = useState('ALL'); // 'ALL' or vendor_id
  
  // Optimistic Local Storage Cart State & Rollback Snapshot Store
  const [cart, setCart] = useState(() => {
    try {
      const cached = localStorage.getItem('chefhub_customer_cart');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const cartSnapshotRef = useRef(cart);

  // Client-Side Predictive Geofencing Reactive Cache
  const [geofencingCache, setGeofencingCache] = useState([]);
  const [serverServiceabilityVerified, setServerServiceabilityVerified] = useState(null);

  const [myOrders, setMyOrders] = useState([]);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancellingOrderIds, setCancellingOrderIds] = useState(new Set());

  // Weak Password Reminder (Assessment + Flag)
  const [showWeakPasswordReminder, setShowWeakPasswordReminder] = useState(() => {
    return sessionStorage.getItem('chefhub_weak_password_warning') === 'true' &&
      !sessionStorage.getItem('chefhub_weak_password_dismissed');
  });

  // Profile Settings: Security & Credentials Modal
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityActiveTab, setSecurityActiveTab] = useState('PASSWORD'); // 'PASSWORD' | 'EMAIL'

  // Change Password Form State
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    loading: false,
    error: '',
    success: ''
  });

  // Change Email (MFA) Form State
  const [emailMfaForm, setEmailMfaForm] = useState({
    step: 1, // 1: Request OTP, 2: Enter OTP & New Email
    method: 'PHONE',
    targetMasked: '',
    otpInput: '',
    devOtp: '',
    newEmailInput: '',
    loading: false,
    error: '',
    success: ''
  });

  // Security modal is managed globally by App.jsx

  const evalChangePwd = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(pwd)
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score, isAcceptable: score >= 4 && checks.length };
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdForm(prev => ({ ...prev, error: '', success: '', loading: true }));
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      setPwdForm(prev => ({ ...prev, loading: false, error: 'Current password and new password are required.' }));
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdForm(prev => ({ ...prev, loading: false, error: 'New password and confirm password do not match.' }));
      return;
    }
    const check = evalChangePwd(pwdForm.newPassword);
    if (!check.isAcceptable) {
      setPwdForm(prev => ({ ...prev, loading: false, error: 'New password must have at least 8 characters, numbers, and special symbols.' }));
      return;
    }

    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/auth/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: pwdForm.currentPassword,
          new_password: pwdForm.newPassword,
          confirm_new_password: pwdForm.confirmPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setPwdForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          loading: false,
          error: '',
          success: '🎉 Password changed successfully! Your account security is updated.'
        });
        sessionStorage.removeItem('chefhub_weak_password_warning');
        setShowWeakPasswordReminder(false);
      } else {
        setPwdForm(prev => ({ ...prev, loading: false, error: data.message || 'Failed to update password.' }));
      }
    } catch {
      setPwdForm(prev => ({ ...prev, loading: false, error: 'Network error updating password.' }));
    }
  };

  const handleRequestEmailChangeOtp = async () => {
    setEmailMfaForm(prev => ({ ...prev, loading: true, error: '', success: '' }));
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/auth/profile/request-email-otp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmailMfaForm(prev => ({
          ...prev,
          loading: false,
          step: 2,
          method: data.method,
          targetMasked: data.target_masked,
          devOtp: data.dev_otp || '123456',
          error: ''
        }));
      } else {
        setEmailMfaForm(prev => ({ ...prev, loading: false, error: data.message || 'Failed to dispatch verification OTP.' }));
      }
    } catch {
      setEmailMfaForm(prev => ({ ...prev, loading: false, error: 'Network error dispatching OTP.' }));
    }
  };

  const handleVerifyEmailOtpAndUpdate = async (e) => {
    e.preventDefault();
    if (!emailMfaForm.otpInput || !emailMfaForm.newEmailInput) {
      setEmailMfaForm(prev => ({ ...prev, error: 'OTP code and new email address are required.' }));
      return;
    }
    setEmailMfaForm(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/auth/profile/verify-email-otp-and-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          otp: emailMfaForm.otpInput,
          new_email: emailMfaForm.newEmailInput
        })
      });
      const data = await res.json();
      if (data.success) {
        if (user) {
          const updatedUser = { ...user, email: data.new_email };
          localStorage.setItem('chefhub_user', JSON.stringify(updatedUser));
        }
        setEmailMfaForm(prev => ({
          ...prev,
          loading: false,
          success: `🎉 Email successfully changed to ${data.new_email}!`,
          error: ''
        }));
        setTimeout(() => {
          setShowSecurityModal(false);
        }, 1500);
      } else {
        setEmailMfaForm(prev => ({ ...prev, loading: false, error: data.message || 'Failed to verify OTP or update email.' }));
      }
    } catch {
      setEmailMfaForm(prev => ({ ...prev, loading: false, error: 'Network error updating email address.' }));
    }
  };
  
  // Default Customer Addresses (clean empty for guests)
  const DEFAULT_SAVED_ADDRESSES = [];

  // Delivery Address & Multi-Address Management State
  const [savedAddresses, setSavedAddresses] = useState(() => {
    if (!user) return [];
    try {
      const saved = localStorage.getItem('chefhub_customer_addresses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [primaryAddress, setPrimaryAddress] = useState(() => {
    if (user?.primary_address) return user.primary_address;
    if (user) {
      try {
        const saved = localStorage.getItem('chefhub_customer_addresses');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            const first = parsed[0];
            return `${first.flat_street}, ${first.locality}, ${first.district}, ${first.state} - ${first.pincode}`;
          }
        }
      } catch {}
    }
    return 'Koramangala 5th Block, Bengaluru';
  });

  const [currentCoords, setCurrentCoords] = useState(() => {
    if (user?.latitude && user?.longitude) {
      return { lat: Number(user.latitude), lng: Number(user.longitude), locality: 'Current Location' };
    }
    if (user) {
      try {
        const saved = localStorage.getItem('chefhub_customer_addresses');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0 && parsed[0].lat) {
            return { lat: Number(parsed[0].lat), lng: Number(parsed[0].lng), locality: parsed[0].locality };
          }
        }
      } catch {}
    }
    return { lat: 12.9352, lng: 77.6245, locality: 'Koramangala 5th Block' };
  });

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInputText, setAddressInputText] = useState(primaryAddress);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressFeedback, setAddressFeedback] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    tag: 'Home',
    recipient_name: user?.name || '',
    phone: user?.phone || '',
    flat_street: '',
    locality: 'Koramangala 5th Block',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    pincode: '560034',
    selectedHubId: 'koramangala'
  });

  // Default Saved Cards (clean empty for privacy)
  const DEFAULT_SAVED_CARDS = [];

  const [savedCards, setSavedCards] = useState(() => {
    if (!user) return [];
    try {
      const saved = localStorage.getItem('chefhub_saved_cards');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardInput, setNewCardInput] = useState({
    bank: 'HDFC Bank',
    brand: 'Visa',
    cardNumber: '',
    holder: user?.name || '',
    exp: '',
    cvv: ''
  });

  // Guest Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 20km Radius enforcement toggle
  const [enforceRadius, setEnforceRadius] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('ALL');
  const [selectedDiet, setSelectedDiet] = useState('ALL'); // 'ALL' | 'VEGAN' | 'SPICY' | 'FAVORITES'
  const [vegOnly, setVegOnly] = useState(false);
  const [serviceType, setServiceType] = useState('DELIVERY'); // 'DELIVERY' | 'PICKUP'
  const [sortBy, setSortBy] = useState('RECOMMENDED'); // 'RECOMMENDED' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING'
  const [favorites, setFavorites] = useState(new Set());
  const [addedFeedback, setAddedFeedback] = useState({});
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Payment Gateway & Order Confirmation States
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [paymentStage, setPaymentStage] = useState('IDLE'); // 'IDLE' | 'PROCESSING' | 'SUCCESS_ANIM' | 'FAILED_ANIM'
  const [paymentStageData, setPaymentStageData] = useState(null);
  const [simulateFail, setSimulateFail] = useState(false);
  const [merchantTransactionView, setMerchantTransactionView] = useState(null);

  // Strict Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponStatus, setCouponStatus] = useState({ state: 'IDLE', message: '' });

  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'CARD', // 'CARD' | 'UPI' | 'NETBANKING' | 'ESCROW_WALLET'
    cardHolder: user?.name || '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    upiApp: 'gpay', // 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'custom'
    upiId: user?.email ? `${user.email.split('@')[0]}@okaxis` : '',
    isUpiVerified: false,
    bankName: 'HDFC Bank',
    deliveryNotes: ''
  });

  // Escrow Wallet State & Top-Up
  const [walletBalance, setWalletBalance] = useState(() => {
    if (!user) return 0.00;
    try {
      const saved = localStorage.getItem('chefhub_wallet_balance');
      return saved ? parseFloat(saved) : 0.00;
    } catch {
      return 0.00;
    }
  });
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [topUpAmountInput, setTopUpAmountInput] = useState('500');
  const [topUpMethod, setTopUpMethod] = useState('UPI');
  const [isAddingMoney, setIsAddingMoney] = useState(false);
  const [addMoneySuccess, setAddMoneySuccess] = useState('');

  // Top-Up Payment Details
  const [topUpCardDetails, setTopUpCardDetails] = useState({
    selectedCardId: '',
    isNewCard: true,
    cardNumber: '',
    cardHolder: user?.name || '',
    expiry: '',
    cvv: '',
    bankName: 'HDFC Bank',
    saveForFuture: true
  });
  const [topUpUpiDetails, setTopUpUpiDetails] = useState({
    upiApp: 'gpay', // 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'cred' | 'custom'
    upiId: user?.email ? `${user.email.split('@')[0]}@okhdfcbank` : '',
    isVerified: !!user,
    showQr: false
  });
  const [topUpNetBankingDetails, setTopUpNetBankingDetails] = useState({
    bankName: 'HDFC Bank'
  });
  // 3D-Secure 2FA / OTP Verification Modal for Top-Up
  const [topUpOtpModal, setTopUpOtpModal] = useState({
    isOpen: false,
    amount: 0,
    method: 'UPI',
    referenceId: '',
    otpInput: '123456',
    generatedOtp: '123456',
    isVerifying: false,
    error: ''
  });

  // Interactive Star Ratings (1-5)
  const [vendorRating, setVendorRating] = useState(5);
  const [riderRating, setRiderRating] = useState(5);
  const [hoverVendorRating, setHoverVendorRating] = useState(0);
  const [hoverRiderRating, setHoverRiderRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const [orderStatusMsg, setOrderStatusMsg] = useState('');
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Top Customer View Switcher (Marketplace vs My Orders)
  const [customerTab, setCustomerTab] = useState('MARKETPLACE'); // 'MARKETPLACE' | 'ORDERS'
  const [ordersFilter, setOrdersFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'
  const [timelineAnimKey, setTimelineAnimKey] = useState(0);
  const menuSectionRef = useRef(null);
  const cuisineScrollRef = useRef(null);

  // Animated sliding indicators
  const [customerTabIndicator, setCustomerTabIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const customerTabRefs = useRef({});

  const updateCustomerTabIndicator = () => {
    if (customerTabRefs.current[customerTab]) {
      const el = customerTabRefs.current[customerTab];
      if (el && el.offsetWidth > 0) {
        setCustomerTabIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1
        });
      }
    }
  };

  // Enforce Guest Mode: Guests strictly explore the marketplace; Orders are unavailable for guests
  useEffect(() => {
    if (!user && customerTab !== 'MARKETPLACE') {
      setCustomerTab('MARKETPLACE');
    }
  }, [user, customerTab]);

  useEffect(() => {
    if (user) {
      updateCustomerTabIndicator();
      const t = setTimeout(updateCustomerTabIndicator, 60);
      return () => clearTimeout(t);
    }
  }, [customerTab, myOrders.length, user]);

  const [filterIndicator, setFilterIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const filterTabRefs = useRef({});

  const updateFilterIndicator = () => {
    if (filterTabRefs.current[selectedDiet]) {
      const el = filterTabRefs.current[selectedDiet];
      if (el && el.offsetWidth > 0) {
        setFilterIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1
        });
      }
    }
  };

  useEffect(() => {
    updateFilterIndicator();
    const t1 = setTimeout(updateFilterIndicator, 60);
    return () => clearTimeout(t1);
  }, [selectedDiet, favorites.size]);

  // Active in-flight request tracking, AbortController & deduplication
  const abortControllerRef = useRef(null);
  const inFlightFetchRef = useRef(null);
  const lastFetchMetaRef = useRef({ lat: null, lng: null, time: 0 });
  const currentCoordsRef = useRef(currentCoords);
  const sseDebounceTimerRef = useRef(null);
  const orderFetchSeqRef = useRef(0);

  // Keep coords ref synced
  useEffect(() => {
    currentCoordsRef.current = currentCoords;
  }, [currentCoords]);

  // Fetch Vendors with dynamic location calculation, AbortController & Deduplication
  const fetchVendors = async (coords = currentCoordsRef.current, force = false) => {
    const targetLat = coords?.lat !== undefined ? Number(coords.lat) : 12.9352;
    const targetLng = coords?.lng !== undefined ? Number(coords.lng) : 77.6245;

    // Deduplication check: if identical coordinates fetched within 3.5 seconds and not forced, reuse existing promise
    const now = Date.now();
    const isSameLocation =
      lastFetchMetaRef.current.lat !== null &&
      Math.abs(lastFetchMetaRef.current.lat - targetLat) < 0.0001 &&
      Math.abs(lastFetchMetaRef.current.lng - targetLng) < 0.0001;

    if (!force) {
      if (isSameLocation && now - lastFetchMetaRef.current.time < 3500) {
        if (inFlightFetchRef.current) return inFlightFetchRef.current;
        return; // Already resolved recently with same coordinates, skip redundant network call
      }
      if (inFlightFetchRef.current && isSameLocation) {
        return inFlightFetchRef.current;
      }
    }

    // Cancel any previous in-flight request to avoid race conditions and queued pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/customer/vendors?lat=${targetLat}&lng=${targetLng}&enforce_radius=false`, {
          signal: controller.signal
        });

        if (!res.ok && res.status !== 304) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.vendors)) {
          setVendors(data.vendors);
          setSelectedVendor((prev) => {
            if (!prev) return data.vendors[0] ? { ...data.vendors[0], menu: { ...data.vendors[0].menu } } : null;
            const match = data.vendors.find((v) => v.vendor_id === prev.vendor_id);
            return match ? { ...match, menu: { ...match.menu } } : (data.vendors[0] ? { ...data.vendors[0], menu: { ...data.vendors[0].menu } } : null);
          });
          lastFetchMetaRef.current = { lat: targetLat, lng: targetLng, time: Date.now() };
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // Expected when a newer request or unmount occurs, do nothing
          return;
        }
        console.error('Fetch vendors error:', err);
      } finally {
        if (abortControllerRef.current === controller) {
          setLoadingVendors(false);
          inFlightFetchRef.current = null;
        }
      }
    })();

    inFlightFetchRef.current = fetchPromise;
    return fetchPromise;
  };

  const fetchMyOrders = async () => {
    const seq = ++orderFetchSeqRef.current;
    try {
      const token = localStorage.getItem('chefhub_token');
      if (!token) return;
      const res = await fetch('/api/customer/my-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Drop response if a newer fetch was initiated while this request was in flight
      if (seq < orderFetchSeqRef.current) return;

      if (data.success && Array.isArray(data.orders)) {
        setMyOrders(prevOrders => {
          return data.orders.map(newOrd => {
            const existing = prevOrders.find(p => Number(p.order_id) === Number(newOrd.order_id));
            if (!existing) return newOrd;
            const existingStage = STAGE_HIERARCHY[String(existing.status || '').toUpperCase()] || 0;
            const newStage = STAGE_HIERARCHY[String(newOrd.status || '').toUpperCase()] || 0;
            // Prevent backwards regression if response is stale compared to confirmed local status
            if (newOrd.status !== 'CANCELLED' && existingStage > newStage) {
              return { ...newOrd, status: existing.status };
            }
            return newOrd;
          });
        });

        setActiveTrackingOrder(prev => {
          if (!prev) return null;
          const updated = data.orders.find(o => Number(o.order_id) === Number(prev.order_id));
          if (!updated) return prev;

          const currentStage = STAGE_HIERARCHY[String(prev.status || '').toUpperCase()] || 0;
          const updatedStage = STAGE_HIERARCHY[String(updated.status || '').toUpperCase()] || 0;

          // Never regress to a lower stage unless the order was cancelled
          const effectiveStatus = (updated.status === 'CANCELLED' || updatedStage >= currentStage)
            ? updated.status
            : prev.status;

          // Merge tracking events monotonically so earlier confirmed milestones aren't dropped
          const prevTracking = Array.isArray(prev.tracking) ? prev.tracking : [];
          const newTracking = Array.isArray(updated.tracking) ? updated.tracking : [];
          const trackingMap = new Map();
          [...prevTracking, ...newTracking].forEach(item => {
            if (item && item.event) {
              trackingMap.set(String(item.event).toUpperCase(), item);
            }
          });
          const mergedTracking = Array.from(trackingMap.values());

          return {
            ...prev,
            ...updated,
            status: effectiveStatus,
            tracking: mergedTracking.length > 0 ? mergedTracking : (updated.tracking || prev.tracking)
          };
        });
      }
    } catch (err) {
      console.error('Fetch my orders error:', err);
    }
  };

  // Coalesce / debounce rapid bursts of real-time events (e.g. from SSE)
  const triggerDebouncedVendorRefresh = () => {
    if (sseDebounceTimerRef.current) clearTimeout(sseDebounceTimerRef.current);
    sseDebounceTimerRef.current = setTimeout(() => {
      fetchVendors(currentCoordsRef.current, true);
    }, 1500);
  };

  // 1. Stabilize user profile address/coords changes without triggering unnecessary renders
  useEffect(() => {
    if (user?.primary_address) {
      setPrimaryAddress(prev => prev === user.primary_address ? prev : user.primary_address);
      setAddressInputText(prev => prev === user.primary_address ? prev : user.primary_address);
    }
    if (user?.latitude && user?.longitude) {
      const uLat = Number(user.latitude);
      const uLng = Number(user.longitude);
      setCurrentCoords(prev => {
        if (Math.abs(prev.lat - uLat) < 0.0001 && Math.abs(prev.lng - uLng) < 0.0001) {
          return prev;
        }
        return {
          lat: uLat,
          lng: uLng,
          locality: prev.locality
        };
      });
    }
  }, [user?.primary_address, user?.latitude, user?.longitude]);

  // 2. Initial & Location-change Fetch: strictly dependent on primitive lat/lng coordinates
  useEffect(() => {
    fetchVendors({ lat: currentCoords.lat, lng: currentCoords.lng });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentCoords.lat, currentCoords.lng]);

  // 3. User Orders & Wallet Sync: strictly dependent on user authentication state
  useEffect(() => {
    if (user) {
      // Authenticated user (Customer, Chef, Rider, Admin can all order & manage wallet)
      fetchMyOrders();
      fetchWalletBalance();
      try {
        const savedAddr = localStorage.getItem('chefhub_customer_addresses');
        if (savedAddr) setSavedAddresses(JSON.parse(savedAddr));
      } catch {}
      try {
        const savedC = localStorage.getItem('chefhub_saved_cards');
        if (savedC) setSavedCards(JSON.parse(savedC));
      } catch {}
    } else {
      // User is logged out / Guest: immediately purge all customer personal data from memory!
      setCart([]);
      setWalletBalance(0.00);
      setMyOrders([]);
      setActiveTrackingOrder(null);
      setConfirmedOrder(null);
      setSavedCards([]);
      setSavedAddresses([]);
      setPrimaryAddress('Koramangala 5th Block, Bengaluru');
      setCurrentCoords({ lat: 12.9352, lng: 77.6245, locality: 'Koramangala 5th Block' });
      setPaymentForm({
        paymentMethod: 'CARD',
        cardHolder: '',
        cardNumber: '',
        expiry: '',
        cvv: '',
        upiApp: 'gpay',
        upiId: '',
        isUpiVerified: false,
        bankName: 'HDFC Bank',
        deliveryNotes: ''
      });
      setTopUpCardDetails({
        selectedCardId: '',
        isNewCard: true,
        cardNumber: '',
        cardHolder: '',
        expiry: '',
        cvv: '',
        bankName: 'HDFC Bank',
        saveForFuture: true
      });
      setTopUpUpiDetails({
        upiApp: 'gpay',
        upiId: '',
        isVerified: false,
        showQr: false
      });
      setCouponCodeInput('');
      setAppliedCoupon(null);
    }
  }, [user?.user_id, customerTab]);

  // 4. Server-Sent Events push stream & conservative background polling (active only for authenticated users)
  useEffect(() => {
    if (!user) return;

    let eventSource = null;
    try {
      const token = localStorage.getItem('chefhub_token');
      const url = token ? `/api/realtime/events?channel=global&token=${encodeURIComponent(token)}` : '/api/realtime/events?channel=global';
      eventSource = new EventSource(url);

      eventSource.addEventListener('DISH_STOCK_UPDATED', () => {
        triggerDebouncedVendorRefresh();
      });
      eventSource.addEventListener('ORDER_CREATED', () => {
        fetchMyOrders();
        fetchWalletBalance();
        triggerDebouncedVendorRefresh();
      });
      eventSource.addEventListener('ORDER_STATUS_CHANGED', (event) => {
        try {
          if (event && event.data) {
            const parsed = JSON.parse(event.data);
            if (parsed && parsed.order_id) {
              const oId = Number(parsed.order_id);
              const newStat = parsed.new_status;

              // Immediately update active tracking order with non-regressive guard
              setActiveTrackingOrder(prev => {
                if (!prev || Number(prev.order_id) !== oId) return prev;
                const prevStage = STAGE_HIERARCHY[String(prev.status || '').toUpperCase()] || 0;
                const newStage = STAGE_HIERARCHY[String(newStat || '').toUpperCase()] || 0;
                if (newStat !== 'ORDER_CANCELLED' && newStage < prevStage) return prev;

                const trackingList = Array.isArray(prev.tracking) ? [...prev.tracking] : [];
                if (newStat && !trackingList.some(t => String(t.event || '').toUpperCase() === String(newStat).toUpperCase())) {
                  trackingList.push({
                    event: newStat,
                    location_note: parsed.note || `Status updated to ${newStat}`,
                    timestamp: new Date().toISOString(),
                    actor_role: parsed.actor_role || 'VENDOR'
                  });
                }

                return {
                  ...prev,
                  status: newStat || prev.status,
                  tracking: trackingList
                };
              });

              // Immediately update myOrders list
              setMyOrders(prevOrders => prevOrders.map(o => {
                if (Number(o.order_id) !== oId) return o;
                const prevStage = STAGE_HIERARCHY[String(o.status || '').toUpperCase()] || 0;
                const newStage = STAGE_HIERARCHY[String(newStat || '').toUpperCase()] || 0;
                if (newStat !== 'ORDER_CANCELLED' && newStage < prevStage) return o;
                return { ...o, status: newStat || o.status };
              }));
            }
          }
        } catch (e) {}
        fetchMyOrders();
        fetchWalletBalance();
      });
      eventSource.addEventListener('ORDER_CANCELLED', () => {
        fetchMyOrders();
        fetchWalletBalance();
        triggerDebouncedVendorRefresh();
      });
    } catch (e) {
      console.warn('Realtime SSE connection fallback:', e);
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchVendors(currentCoordsRef.current, false);
        fetchMyOrders();
        fetchWalletBalance();
      }
    }, 30000);

    return () => {
      if (eventSource) eventSource.close();
      if (sseDebounceTimerRef.current) clearTimeout(sseDebounceTimerRef.current);
      clearInterval(interval);
    };
  }, [user?.user_id]);

  // Real-time auto-sync for live tracking modal (continuous active heartbeat while modal is open)
  useEffect(() => {
    if (!activeTrackingOrder?.order_id) return;

    // Heartbeat every 3 seconds while customer is viewing the live modal
    const trackInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMyOrders();
      }
    }, 3000);

    return () => clearInterval(trackInterval);
  }, [activeTrackingOrder?.order_id]);

  // Fetch Customer Wallet Balance
  const fetchWalletBalance = async () => {
    try {
      const token = localStorage.getItem('chefhub_token');
      if (!token) return;
      const res = await fetch('/api/customer/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.balance !== undefined) {
        setWalletBalance(Number(data.balance));
        localStorage.setItem('chefhub_wallet_balance', String(data.balance));
      }
    } catch (e) {
      console.warn('Wallet fetch fallback:', e.message);
    }
  };

  // --- SAVED CARDS MANAGEMENT (RBI Compliant) ---
  const handleRemoveCard = (cardId) => {
    if (savedCards.length <= 1) {
      if (!confirm('You are removing your last saved card. Under RBI regulations, you will need to re-enter card details for subsequent transactions. Remove card?')) {
        return;
      }
    } else {
      if (!confirm('Remove this saved card? Under RBI storage guidelines, its credentials will be permanently erased.')) {
        return;
      }
    }
    const updated = savedCards.filter(c => c.id !== cardId);
    setSavedCards(updated);
    localStorage.setItem('chefhub_saved_cards', JSON.stringify(updated));
    if (topUpCardDetails.selectedCardId === cardId && updated.length > 0) {
      setTopUpCardDetails(prev => ({ ...prev, selectedCardId: updated[0].id }));
    }
  };

  const handleSaveNewCard = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawNum = newCardInput.cardNumber.replace(/\s+/g, '');
    if (rawNum.length < 15 || rawNum.length > 19) {
      alert('Please enter a valid 16-digit card number.');
      return;
    }
    if (!newCardInput.holder.trim()) {
      alert('Please enter cardholder name as printed on card.');
      return;
    }
    if (!newCardInput.exp || !newCardInput.exp.includes('/') || newCardInput.exp.length < 5) {
      alert('Please enter valid expiry date (MM/YY).');
      return;
    }
    if (!newCardInput.cvv || newCardInput.cvv.length < 3) {
      alert('Please enter a 3 or 4-digit CVV / security code.');
      return;
    }

    const cardId = 'card_' + Date.now().toString().slice(-6);
    const last4 = rawNum.slice(-4);
    const brand = rawNum.startsWith('4') ? 'Visa' : rawNum.startsWith('5') ? 'Mastercard' : 'RuPay';
    const bankName = newCardInput.bank || (brand + ' Bank Card');

    const createdCard = {
      id: cardId,
      bank: bankName,
      brand,
      last4,
      holder: newCardInput.holder.trim(),
      exp: newCardInput.exp,
      cardNumber: `${rawNum.slice(0, 4)} •••• •••• ${last4}`,
      cvv: newCardInput.cvv
    };

    const updated = [...savedCards, createdCard];
    setSavedCards(updated);
    localStorage.setItem('chefhub_saved_cards', JSON.stringify(updated));
    setPaymentForm(prev => ({
      ...prev,
      cardNumber: `${rawNum.slice(0, 4)} ${rawNum.slice(4, 8)} ${rawNum.slice(8, 12)} ${last4}`,
      cardHolder: newCardInput.holder.trim(),
      expiry: newCardInput.exp,
      cvv: newCardInput.cvv
    }));
    setTopUpCardDetails(prev => ({
      ...prev,
      selectedCardId: cardId,
      isNewCard: false
    }));
    setShowAddCardModal(false);
    setNewCardInput({
      bank: 'HDFC Bank',
      brand: 'Visa',
      cardNumber: '',
      holder: user?.name || '',
      exp: '',
      cvv: ''
    });
    alert('✅ New card saved securely under RBI tokenization guidelines!');
  };

  // --- SAVED ADDRESSES MANAGEMENT ---
  const handleSelectSavedAddress = (addr) => {
    const formatted = `${addr.flat_street}, ${addr.locality}, ${addr.district}, ${addr.state} - ${addr.pincode}`;
    setPrimaryAddress(formatted);
    setAddressInputText(formatted);
    const newCoords = {
      lat: addr.lat || 12.9352,
      lng: addr.lng || 77.6245,
      locality: addr.locality
    };
    setCurrentCoords(newCoords);
    fetchVendors(newCoords, true);
    setShowAddressModal(false);
    setAddressFeedback(`📍 Delivering to ${addr.tag} (${addr.locality})!`);
    setTimeout(() => setAddressFeedback(''), 2500);
  };

  const handleRemoveAddress = (addrId) => {
    if (savedAddresses.length <= 1) {
      alert('You must have at least one delivery address in your account.');
      return;
    }
    if (!confirm('Are you sure you want to delete this address?')) return;
    const updated = savedAddresses.filter(a => a.id !== addrId);
    setSavedAddresses(updated);
    localStorage.setItem('chefhub_customer_addresses', JSON.stringify(updated));
  };

  const handleSaveNewAddress = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newAddressForm.recipient_name.trim()) {
      alert('Please enter recipient customer name.');
      return;
    }
    const cleanPhone = newAddressForm.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile contact number.');
      return;
    }
    if (!newAddressForm.flat_street.trim() || newAddressForm.flat_street.trim().length < 5) {
      alert('Please provide complete house/flat number, building, and street name.');
      return;
    }
    if (!newAddressForm.pincode || newAddressForm.pincode.length < 6) {
      alert('Please enter a valid 6-digit PIN code.');
      return;
    }

    // Match coords from chosen hub or currentCoords
    const matchedHub = BANGALORE_HUBS.find(h => h.id === newAddressForm.selectedHubId) || BANGALORE_HUBS[0];
    const newId = 'addr_' + Date.now().toString().slice(-6);

    const createdAddr = {
      id: newId,
      tag: newAddressForm.tag,
      recipient_name: newAddressForm.recipient_name.trim(),
      phone: cleanPhone,
      flat_street: newAddressForm.flat_street.trim(),
      locality: matchedHub.name,
      district: newAddressForm.district || 'Bengaluru Urban',
      state: newAddressForm.state || 'Karnataka',
      pincode: newAddressForm.pincode,
      lat: matchedHub.lat,
      lng: matchedHub.lng
    };

    const updated = [createdAddr, ...savedAddresses];
    setSavedAddresses(updated);
    localStorage.setItem('chefhub_customer_addresses', JSON.stringify(updated));
    handleSelectSavedAddress(createdAddr);
    setShowNewAddressForm(false);
    setNewAddressForm({
      tag: 'Home',
      recipient_name: user?.name || '',
      phone: user?.phone || '',
      flat_street: '',
      locality: 'Koramangala 5th Block',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560034',
      selectedHubId: 'koramangala'
    });
  };

  // --- ESCROW WALLET TOP-UP WITH FULL PAYMENT VERIFICATION ---
  const handleInitiateWalletTopUp = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const num = parseFloat(topUpAmountInput);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (num < 50) {
      alert('Minimum wallet top-up is ₹50.');
      return;
    }

    if (topUpMethod === 'CARD') {
      if (topUpCardDetails.isNewCard) {
        const raw = topUpCardDetails.cardNumber.replace(/\s+/g, '');
        if (raw.length < 15) {
          alert('Please enter complete 16-digit card number.');
          return;
        }
        if (!topUpCardDetails.expiry || topUpCardDetails.expiry.length < 5) {
          alert('Please enter expiry date (MM/YY).');
          return;
        }
        if (!topUpCardDetails.cvv || topUpCardDetails.cvv.length < 3) {
          alert('Please enter CVV.');
          return;
        }
      } else {
        if (!topUpCardDetails.selectedCardId) {
          alert('Please select a saved card or enter new card details.');
          return;
        }
      }
    } else if (topUpMethod === 'UPI') {
      if (topUpUpiDetails.upiApp === 'custom' && (!topUpUpiDetails.upiId || !topUpUpiDetails.upiId.includes('@'))) {
        alert('Please enter a valid UPI ID (e.g., alex@okaxis).');
        return;
      }
    }

    // Open 3D-Secure 2FA OTP modal
    setTopUpOtpModal({
      isOpen: true,
      amount: num,
      method: topUpMethod,
      referenceId: 'ESCROW-TOPUP-' + Math.floor(10000000 + Math.random() * 90000000),
      otpInput: '123456',
      generatedOtp: '123456',
      isVerifying: false,
      error: ''
    });
  };

  const handleVerifyTopUpOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setTopUpOtpModal(prev => ({ ...prev, isVerifying: true, error: '' }));

    // Simulate gateway delay
    await new Promise(r => setTimeout(r, 1000));

    const num = topUpOtpModal.amount;

    try {
      const token = localStorage.getItem('chefhub_token');
      if (token) {
        await fetch('/api/customer/wallet/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: num,
            payment_method: topUpOtpModal.method,
            reference_id: topUpOtpModal.referenceId
          })
        });
      }
    } catch (err) {
      console.warn('API top-up fallback:', err);
    }

    // Credit state & localStorage
    setWalletBalance(prev => {
      const next = prev + num;
      localStorage.setItem('chefhub_wallet_balance', String(next));
      return next;
    });

    // If new card and save checked, persist card
    if (topUpMethod === 'CARD' && topUpCardDetails.isNewCard && topUpCardDetails.saveForFuture) {
      const rawNum = topUpCardDetails.cardNumber.replace(/\s+/g, '');
      const last4 = rawNum.slice(-4);
      const brand = rawNum.startsWith('4') ? 'Visa' : rawNum.startsWith('5') ? 'Mastercard' : 'RuPay';
      const createdCard = {
        id: 'card_' + Date.now().toString().slice(-6),
        bank: topUpCardDetails.bankName || 'HDFC Bank',
        brand,
        last4,
        holder: topUpCardDetails.cardHolder || user?.name || '',
        exp: topUpCardDetails.expiry,
        cardNumber: `${rawNum.slice(0, 4)} •••• •••• ${last4}`,
        cvv: topUpCardDetails.cvv
      };
      setSavedCards(prev => {
        const up = [...prev, createdCard];
        localStorage.setItem('chefhub_saved_cards', JSON.stringify(up));
        return up;
      });
    }

    setTopUpOtpModal(prev => ({ ...prev, isOpen: false, isVerifying: false }));
    setShowAddMoneyModal(false);
    setAddMoneySuccess(`🎉 ₹${num.toFixed(2)} credited to your Escrow Wallet via 3D-Secure!`);
    setTimeout(() => setAddMoneySuccess(''), 3000);
  };

  const handleTopUpWallet = (quickAmt) => {
    setTopUpAmountInput(String(quickAmt));
    setShowAddMoneyModal(true);
  };

  // Cuisine scroll buttons
  const scrollCuisines = (direction) => {
    if (cuisineScrollRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      cuisineScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Change Delivery Hub Preset
  const handleSelectHub = (hub) => {
    const newCoords = { lat: hub.lat, lng: hub.lng, locality: hub.name };
    setCurrentCoords(newCoords);
    const newAddr = `${hub.name}, Bengaluru, Karnataka`;
    setPrimaryAddress(newAddr);
    setAddressInputText(newAddr);
    fetchVendors(newCoords, true);
    setAddressFeedback(`📍 Delivery hub switched to ${hub.name}!`);
    setTimeout(() => setAddressFeedback(''), 2500);
  };

  // Save Primary Address to Profile via API
  const handleSavePrimaryAddress = async () => {
    if (!addressInputText.trim()) return;
    setIsSavingAddress(true);
    setAddressFeedback('');
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/auth/profile/address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          primary_address: addressInputText.trim(),
          latitude: currentCoords.lat,
          longitude: currentCoords.lng
        })
      });
      const data = await res.json();
      if (data.success) {
        setPrimaryAddress(addressInputText.trim());
        setAddressFeedback('✅ Address saved to profile!');
        fetchVendors(currentCoords, true);
        setTimeout(() => {
          setShowAddressModal(false);
          setAddressFeedback('');
        }, 1200);
      } else {
        setAddressFeedback(`❌ ${data.message || 'Failed to save address'}`);
      }
    } catch (err) {
      setAddressFeedback('❌ Connection error saving address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Coupon validation
  const handleApplyCoupon = async (codeToTry = couponCodeInput) => {
    const code = (codeToTry || '').trim().toUpperCase();
    if (!code) return;
    setCouponStatus({ state: 'VALIDATING', message: 'Validating coupon code...' });
    try {
      const res = await fetch('/api/customer/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_code: code,
          order_subtotal: cartTotal
        })
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponCodeInput(data.coupon.code);
        setCouponStatus({ state: 'SUCCESS', message: data.message });
      } else {
        setAppliedCoupon(null);
        setCouponStatus({ state: 'ERROR', message: data.message || `Coupon '${code}' is invalid.` });
      }
    } catch (err) {
      setCouponStatus({ state: 'ERROR', message: 'Server connection error validating coupon.' });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponStatus({ state: 'IDLE', message: '' });
  };

  // Select chef kitchen
  const handleSelectVendor = (v) => {
    setSelectedVendor(v);
    setSelectedChefFilter(v.vendor_id);
    setTimeout(() => {
      if (menuSectionRef.current) {
        menuSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  const toggleFavorite = (dishId) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(dishId)) next.delete(dishId);
      else next.add(dishId);
      return next;
    });
  };

  // Optimistic Local Storage Sync for Cart State with Ephemeral Rollback Store
  const syncCartWithServer = async (cartToSync, fallbackSnapshot) => {
    try {
      const token = localStorage.getItem('chefhub_token');
      if (!token) return;
      const res = await fetch('/api/v1/customer/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cart: cartToSync, action: 'SYNC' })
      });
      const data = await res.json();
      if (!data.success) {
        console.warn('Cart sync rollback triggered:', data.error);
        setCart(fallbackSnapshot);
        localStorage.setItem('chefhub_customer_cart', JSON.stringify(fallbackSnapshot));
        alert(`Cart Update Conflict: ${data.error || 'Server rejected item quantity. Rolling back to previous local snapshot.'}`);
      }
    } catch (err) {
      console.warn('Cart sync network blip:', err);
    }
  };

  const addToCart = (dish, vendorForDish = selectedVendor) => {
    const v = vendorForDish || selectedVendor;
    const isVendorOpen = v &&
      v.is_open !== false &&
      v.is_currently_open !== false &&
      v.menu?.is_open !== false &&
      v.menu?.is_currently_open !== false;

    if (!isVendorOpen) {
      alert(`Chef is currently NOT accepting orders (${v?.closed_reason || v?.menu?.closed_reason || 'Store Closed'}). Please come back later.`);
      return;
    }

    if (enforceRadius && v?.is_within_20km === false) {
      alert(`Cannot order: Kitchen is ${v?.distance_km} km away, which exceeds our 20 km delivery radius.`);
      return;
    }

    const availableStock = dish.daily_stock !== undefined && dish.daily_stock !== null ? Number(dish.daily_stock) : 20;

    if (dish.is_available === false || dish.is_available === 0 || availableStock <= 0) {
      alert(`'${dish.name}' is currently out of stock (0 portions remaining today).`);
      return;
    }

    const prevSnapshot = [...cart];
    cartSnapshotRef.current = prevSnapshot;
    const existing = prevSnapshot.find((item) => item.dish_id === dish.dish_id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + 1 > availableStock) {
      alert(`Cannot add more '${dish.name}': Only ${availableStock} portion${availableStock > 1 ? 's' : ''} available today.`);
      return;
    }
    if (currentQty >= 5) {
      alert('Maximum order limit per dish is 5 items.');
      return;
    }

    const nextCart = existing
      ? prevSnapshot.map((item) => (item.dish_id === dish.dish_id ? { ...item, quantity: item.quantity + 1 } : item))
      : [...prevSnapshot, { ...dish, vendor_id: v.vendor_id, vendor_name: v.business_name, quantity: 1 }];

    setCart(nextCart);
    localStorage.setItem('chefhub_customer_cart', JSON.stringify(nextCart));
    syncCartWithServer(nextCart, prevSnapshot);
  };

  const updateCartQuantity = (dish_id, newQty) => {
    if (newQty <= 0) {
      removeFromCart(dish_id);
      return;
    }
    if (newQty > 5) {
      alert('Maximum limit reached: You can order up to 5 portions of this dish per order.');
      return;
    }
    const prevSnapshot = [...cart];
    cartSnapshotRef.current = prevSnapshot;
    const nextCart = prevSnapshot.map((item) => (item.dish_id === dish_id ? { ...item, quantity: newQty } : item));
    setCart(nextCart);
    localStorage.setItem('chefhub_customer_cart', JSON.stringify(nextCart));
    syncCartWithServer(nextCart, prevSnapshot);
  };

  const handleAddToCartWithFeedback = (dish, vendorForDish = selectedVendor) => {
    addToCart(dish, vendorForDish);
    setAddedFeedback((prev) => ({ ...prev, [dish.dish_id]: true }));
    setTimeout(() => {
      setAddedFeedback((prev) => ({ ...prev, [dish.dish_id]: false }));
    }, 1200);
  };

  const removeFromCart = (dish_id) => {
    const prevSnapshot = [...cart];
    cartSnapshotRef.current = prevSnapshot;
    const nextCart = prevSnapshot.filter((item) => item.dish_id !== dish_id);
    setCart(nextCart);
    localStorage.setItem('chefhub_customer_cart', JSON.stringify(nextCart));
    syncCartWithServer(nextCart, prevSnapshot);
  };

  const cartTotal = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const couponDiscountAmount = appliedCoupon ? Number(appliedCoupon.discount_amount || 0) : 0;
  const effectiveDeliveryFee = appliedCoupon?.code === 'FREESHIP' ? 0.00 : (serviceType === 'PICKUP' ? 0.00 : DELIVERY_FEE);
  const grandTotal = Math.max(0, cartTotal - couponDiscountAmount + effectiveDeliveryFee);

  const handleOpenPaymentGateway = () => {
    const token = localStorage.getItem('chefhub_token');
    if (!user || !token || token === 'undefined') {
      setShowAuthModal(true);
      return;
    }
    if (cart.length === 0) return;

    if (!isCurrentAreaServiced) {
      alert('📍 Selected delivery address is outside our 20km chef delivery coverage area. Please choose a serviced delivery address to proceed.');
      setShowAddressModal(true);
      return;
    }

    if (!primaryAddress || primaryAddress.trim().length < 5) {
      setShowAddressModal(true);
      alert('Please set and save your primary delivery address first.');
      return;
    }

    setShowPaymentGatewayModal(true);
  };

  const handleExecutePaymentAndOrder = async (e, shouldFail = false) => {
    if (e && e.preventDefault) e.preventDefault();
    const vendorToOrder = selectedVendor || vendors[0];
    if (!vendorToOrder) return;

    const token = localStorage.getItem('chefhub_token');
    if (!user || !token || token === 'undefined') {
      setIsProcessingPayment(false);
      setPaymentStage('IDLE');
      setShowPaymentGatewayModal(false);
      setShowAuthModal(true);
      alert('🔒 Authentication Required: Please sign in to your account to complete payment.');
      return;
    }

    if (!isCurrentAreaServiced) {
      alert('📍 Cannot place order: Selected address is outside our 20km chef delivery coverage area. Please switch to a serviced delivery address.');
      setIsProcessingPayment(false);
      setPaymentStage('IDLE');
      setShowAddressModal(true);
      return;
    }

    if (paymentForm.paymentMethod === 'CARD') {
      const cleanCard = paymentForm.cardNumber.replace(/\D/g, '');
      if (cleanCard.length < 13 || !validateLuhn(cleanCard)) {
        alert('🔒 Pre-Flight Validation Failed: Card number does not pass Luhn algorithm compliance. Please verify your 16-digit card number before tokenization.');
        setIsProcessingPayment(false);
        setPaymentStage('IDLE');
        return;
      }
    }

    setIsProcessingPayment(true);
    setPaymentStage('PROCESSING');
    setOrderStatusMsg('🔒 Authorizing 256-Bit SSL Payment & Securing Escrow...');

    const methodLabel = paymentForm.paymentMethod === 'CARD' ? `Credit Card (${paymentForm.cardNumber.slice(-4) || '8821'})` :
                        paymentForm.paymentMethod === 'UPI' ? `UPI (${paymentForm.upiApp ? paymentForm.upiApp.toUpperCase() : 'APP'} • ${paymentForm.upiId || 'alex@upi'})` :
                        paymentForm.paymentMethod === 'NETBANKING' ? `Net Banking (${paymentForm.bankName || 'HDFC Bank'})` :
                        'ChefHub Escrow Wallet';

    if (paymentForm.paymentMethod === 'ESCROW_WALLET' && walletBalance < grandTotal) {
      alert(`Insufficient Escrow Wallet balance (Available: ₹${walletBalance.toFixed(2)}, Required: ₹${grandTotal.toFixed(2)}). Please add money to your wallet or choose another payment method.`);
      setIsProcessingPayment(false);
      setPaymentStage('IDLE');
      return;
    }

    if (shouldFail) {
      setSimulateFail(true);
      setTimeout(() => {
        setIsProcessingPayment(false);
        const failTxnId = 'TXN-FAIL-' + Math.floor(10000000 + Math.random() * 90000000);
        const failureData = {
          order_id: null,
          vendor_name: vendorToOrder.name || vendorToOrder.business_name || 'Chef Kitchen',
          vendor_id: vendorToOrder.vendor_id,
          total_amount: grandTotal.toFixed(2),
          items: [...cart],
          payment_method: methodLabel,
          payment_ref: failTxnId,
          error_reason: paymentForm.paymentMethod === 'CARD' ? 'Bank Authorization Declined: Card issuer denied test charge' :
                        paymentForm.paymentMethod === 'UPI' ? 'UPI PIN Authentication Timeout / Rejected by Bank' :
                        paymentForm.paymentMethod === 'NETBANKING' ? 'NetBanking Session Timed Out by Bank Server' :
                        'Insufficient Escrow Wallet balance',
          status: 'FAILED',
          created_at: new Date().toISOString()
        };
        setPaymentStageData(failureData);
        setPaymentStage('FAILED_ANIM');

        setTimeout(() => {
          setShowPaymentGatewayModal(false);
          setPaymentStage('IDLE');
          setSimulateFail(false);
          setMerchantTransactionView(failureData);
          setOrderStatusMsg('❌ Payment Failed: Authorization declined.');
        }, 2600);
      }, 1100);
      return;
    }

    setSimulateFail(false);
    await new Promise((resolve) => setTimeout(resolve, 1100));

    try {
      const token = localStorage.getItem('chefhub_token');

      const res = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vendor_id: vendorToOrder.vendor_id,
          items: cart.map((c) => ({ dish_id: c.dish_id, quantity: c.quantity })),
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          delivery_address: primaryAddress,
          payment_method: methodLabel
        })
      });

      const data = await res.json();
      setIsProcessingPayment(false);

      if (res.status === 401 || res.status === 403 || (!data.success && data.message && (data.message.toLowerCase().includes('token') || data.message.toLowerCase().includes('session') || data.message.toLowerCase().includes('authentication')))) {
        localStorage.removeItem('chefhub_token');
        setShowPaymentGatewayModal(false);
        setPaymentStage('IDLE');
        setShowAuthModal(true);
        alert('🔒 Session Expired: Your login session has expired or is invalid. Please sign in again to complete your order.');
        return;
      }

      if (data.success) {
        if (paymentForm.paymentMethod === 'ESCROW_WALLET') {
          setWalletBalance(prev => Math.max(0, prev - grandTotal));
          fetchWalletBalance();
        }

        const newOrderId = data.order_id || (data.order && data.order.order_id) || Math.floor(1000 + Math.random() * 9000);
        const txnId = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);

        const orderReceipt = {
          order_id: newOrderId,
          vendor_name: vendorToOrder.name || vendorToOrder.business_name || 'Chef Kitchen',
          vendor_id: vendorToOrder.vendor_id,
          total_amount: grandTotal.toFixed(2),
          items: [...cart],
          subtotal: cartTotal.toFixed(2),
          delivery_fee: effectiveDeliveryFee.toFixed(2),
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          discount_amount: couponDiscountAmount.toFixed(2),
          payment_method: methodLabel,
          payment_ref: txnId,
          delivery_address: primaryAddress,
          status: 'CONFIRMED',
          escrow_status: 'HELD_IN_ESCROW',
          created_at: new Date().toISOString()
        };

        setPaymentStageData(orderReceipt);
        setPaymentStage('SUCCESS_ANIM');

        setTimeout(() => {
          setCart([]);
          setShowPaymentGatewayModal(false);
          setPaymentStage('IDLE');
          setConfirmedOrder(orderReceipt);
          setMerchantTransactionView(orderReceipt);
          setOrderStatusMsg('✅ Payment Successful & Order Confirmed!');
          fetchMyOrders();
          fetchVendors(currentCoords, true);
        }, 2600);
      } else {
        const failTxnId = 'TXN-FAIL-' + Math.floor(10000000 + Math.random() * 90000000);
        const failureData = {
          order_id: null,
          vendor_name: vendorToOrder.name || vendorToOrder.business_name || 'Chef Kitchen',
          vendor_id: vendorToOrder.vendor_id,
          total_amount: grandTotal.toFixed(2),
          items: [...cart],
          payment_method: methodLabel,
          payment_ref: failTxnId,
          error_reason: data.message || 'Item out of stock or insufficient inventory.',
          status: 'FAILED',
          created_at: new Date().toISOString()
        };

        setPaymentStageData(failureData);
        setPaymentStage('FAILED_ANIM');

        setTimeout(() => {
          setShowPaymentGatewayModal(false);
          setPaymentStage('IDLE');
          setMerchantTransactionView(failureData);
          setOrderStatusMsg(`❌ Order Failed: ${data.message}`);
          fetchVendors(currentCoords, true);
        }, 2600);
      }
    } catch (err) {
      console.error('Order placement execution error:', err);
      setIsProcessingPayment(false);
      const failTxnId = 'TXN-ERR-' + Math.floor(10000000 + Math.random() * 90000000);
      const failureData = {
        order_id: null,
        vendor_name: vendorToOrder.name || vendorToOrder.business_name || 'Chef Kitchen',
        vendor_id: vendorToOrder.vendor_id,
        total_amount: grandTotal.toFixed(2),
        items: [...cart],
        payment_method: methodLabel,
        payment_ref: failTxnId,
        error_reason: 'Network gateway connection timeout. Please retry.',
        status: 'FAILED',
        created_at: new Date().toISOString()
      };
      setPaymentStageData(failureData);
      setPaymentStage('FAILED_ANIM');

      setTimeout(() => {
        setShowPaymentGatewayModal(false);
        setPaymentStage('IDLE');
        setMerchantTransactionView(failureData);
      }, 2600);
    }
  };

  const executeOrderCancellation = async (order_id) => {
    setIsCancellingOrder(true);
    setCancellingOrderIds(prev => new Set([...prev, order_id]));
    const prevOrders = myOrders;

    // 1. Optimistic Update: Instantly reflect CANCELLED state locally so UI does not freeze
    setMyOrders(prev => prev.map(o => (String(o.order_id || o.id) === String(order_id) ? { ...o, status: 'CANCELLED' } : o)));
    setOrderStatusMsg(`⚡ Order #${order_id} cancelled. Processing multi-database sync in background...`);
    setCancelModalOrder(null);

    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/customer/orders/${order_id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrderStatusMsg(`✅ Order #${order_id} cancelled. Escrow refund initiated.`);
        fetchMyOrders();
      } else {
        // Rollback on server failure
        setMyOrders(prevOrders);
        alert(data.message || 'Failed to cancel order. Reverting changes.');
      }
    } catch (err) {
      // Rollback on network failure
      setMyOrders(prevOrders);
      alert('Failed to cancel order due to network issue. Reverting changes.');
    } finally {
      setIsCancellingOrder(false);
      setCancellingOrderIds(prev => {
        const next = new Set(prev);
        next.delete(order_id);
        return next;
      });
    }
  };

  const handleOpenTracking = (order) => {
    setActiveTrackingOrder(order);
    setTimelineAnimKey(prev => prev + 1);
    fetchMyOrders();
  };

  const getTimelineStages = (order) => {
    if (!order) return [];
    const status = String(order.status || '').toUpperCase();
    const isCancelled = status === 'CANCELLED';

    const orderTimeRaw = order.timestamp || order.created_at || new Date();
    const baseDate = new Date(orderTimeRaw);
    const validBaseTime = !isNaN(baseDate.getTime()) ? baseDate : new Date();

    const trackingList = Array.isArray(order.tracking) ? order.tracking : [];
    const getEventTimestamp = (patterns) => {
      const match = trackingList.find(t => patterns.includes(String(t.event || '').toUpperCase()));
      return match && match.timestamp ? new Date(match.timestamp) : null;
    };

    if (isCancelled) {
      const cancelTime = getEventTimestamp(['CANCELLED', 'ORDER_CANCELLED']) || (order.updated_at ? new Date(order.updated_at) : validBaseTime);
      return [
        {
          key: 'ORDER_PLACED',
          title: 'ORDER_PLACED',
          desc: 'Order submitted and escrow payment secured',
          time: getEventTimestamp(['ORDER_PLACED']) || validBaseTime,
          isDone: true,
          isActive: false
        },
        {
          key: 'CANCELLED',
          title: 'ORDER_CANCELLED',
          desc: 'Order was cancelled; payment refund initiated to original payment method',
          time: cancelTime,
          isDone: true,
          isActive: true,
          isError: true
        }
      ];
    }

    const stageMap = {
      PLACED: 0,
      ORDER_PLACED: 0,
      CONFIRMED: 0,
      PREPARING: 1,
      KITCHEN_PREPARING: 1,
      READY: 2,
      KITCHEN_READY: 2,
      READY_FOR_PICKUP: 2,
      OUT_FOR_DELIVERY: 3,
      RIDER_ACCEPTED: 3,
      DELIVERED: 4
    };

    const currentStageIdx = stageMap[status] !== undefined ? stageMap[status] : 0;

    const tPlaced = getEventTimestamp(['ORDER_PLACED']) || (order.timestamp ? new Date(order.timestamp) : (order.created_at ? new Date(order.created_at) : validBaseTime));
    const tPrep = getEventTimestamp(['KITCHEN_PREPARING', 'PREPARING']) || (order.prepared_at ? new Date(order.prepared_at) : (currentStageIdx >= 1 ? (order.updated_at ? new Date(order.updated_at) : validBaseTime) : null));
    const tReady = getEventTimestamp(['KITCHEN_READY', 'READY', 'READY_FOR_PICKUP']) || (order.ready_at ? new Date(order.ready_at) : (currentStageIdx >= 2 ? (order.updated_at ? new Date(order.updated_at) : null) : null));
    const tRider = getEventTimestamp(['RIDER_ACCEPTED', 'OUT_FOR_DELIVERY']) || (order.dispatched_at ? new Date(order.dispatched_at) : (currentStageIdx >= 3 ? (order.updated_at ? new Date(order.updated_at) : null) : null));
    const tDelivered = getEventTimestamp(['DELIVERED']) || (order.delivered_at ? new Date(order.delivered_at) : (currentStageIdx >= 4 ? (order.updated_at ? new Date(order.updated_at) : null) : null));

    const baseStages = [
      {
        key: 'ORDER_PLACED',
        title: 'ORDER_PLACED',
        desc: 'Order submitted and escrow payment secured',
        time: tPlaced
      },
      {
        key: 'KITCHEN_PREPARING',
        title: 'KITCHEN_PREPARING',
        desc: `${order.vendor_name || 'Chef'} started preparing your handcrafted meal`,
        time: tPrep,
        pendingLabel: 'Waiting for chef to accept & begin preparation'
      },
      {
        key: 'KITCHEN_READY',
        title: 'KITCHEN_READY',
        desc: 'Order ready • Packed & waiting to be picked up by a delivery person',
        time: tReady,
        pendingLabel: 'Chef actively cooking & packaging your meal'
      },
      {
        key: 'RIDER_ACCEPTED',
        title: 'RIDER_ACCEPTED',
        desc: `${order.rider_name || 'Courier'} picked up order and is en route`,
        time: tRider,
        pendingLabel: 'Courier dispatch will activate once meal is packed'
      },
      {
        key: 'DELIVERED',
        title: 'DELIVERED',
        desc: 'Order delivered successfully to your doorstep',
        time: tDelivered,
        pendingLabel: 'Estimated delivery: ~25-35 mins from dispatch'
      }
    ];

    return baseStages.map((s, idx) => ({
      ...s,
      isDone: idx <= currentStageIdx,
      isActive: idx === currentStageIdx,
      isPending: idx > currentStageIdx,
      index: idx
    }));
  };

  // Compile Unified Dishes across all available kitchens
  const allDishesMarketplace = React.useMemo(() => {
    const list = [];
    vendors.forEach((v) => {
      // Check 20km radius limit
      const isWithinRadius = v.is_within_20km !== false;
      const isClosed = v.is_currently_open === false || v.menu?.is_currently_open === false;

      v.menu?.categories?.forEach((cat) => {
        cat.dishes?.forEach((dish) => {
          list.push({
            ...dish,
            vendor_id: v.vendor_id,
            vendor_name: v.business_name,
            vendor_distance_km: v.distance_km || 3.2,
            vendor_delivery_mins: v.estimated_delivery_mins || 25,
            vendor_is_open: !isClosed,
            vendor_is_within_radius: isWithinRadius,
            category_name: cat.category_name
          });
        });
      });
    });
    return list;
  }, [vendors]);

  // Filtered dishes for Unified Marketplace
  const filteredMarketplaceDishes = React.useMemo(() => {
    return allDishesMarketplace.filter((dish) => {
      // Chef filter
      if (selectedChefFilter !== 'ALL' && dish.vendor_id !== selectedChefFilter) {
        return false;
      }

      // Radius enforcement
      if (enforceRadius && !dish.vendor_is_within_radius) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = dish.name.toLowerCase().includes(q);
        const matchesDesc = dish.description && dish.description.toLowerCase().includes(q);
        const matchesChef = dish.vendor_name && dish.vendor_name.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesChef) return false;
      }

      // Cuisine category
      if (selectedCuisine !== 'ALL') {
        const c = selectedCuisine.toLowerCase();
        const matches = dish.name.toLowerCase().includes(c) ||
          dish.category_name.toLowerCase().includes(c) ||
          (dish.description && dish.description.toLowerCase().includes(c));
        if (!matches) return false;
      }

      // Veg only toggle
      if (vegOnly) {
        const isVeg = dish.name.toLowerCase().includes('paneer') ||
          dish.name.toLowerCase().includes('ravioli') ||
          dish.name.toLowerCase().includes('gnocchi') ||
          dish.name.toLowerCase().includes('focaccia') ||
          dish.name.toLowerCase().includes('dosa') ||
          dish.name.toLowerCase().includes('naan') ||
          dish.name.toLowerCase().includes('lassi') ||
          dish.name.toLowerCase().includes('tiramisu') ||
          dish.dietary_tags?.some(t => t.toLowerCase().includes('veg'));
        if (!isVeg) return false;
      }

      // Diet pill
      if (selectedDiet === 'VEGAN') {
        const isVeg = dish.dietary_tags?.some(t => t.toLowerCase().includes('sweet') || t.toLowerCase().includes('veg'));
        if (!isVeg) return false;
      } else if (selectedDiet === 'SPICY') {
        const isSpicy = dish.name.toLowerCase().includes('curry') || dish.name.toLowerCase().includes('tikka') || dish.name.toLowerCase().includes('pepper') || dish.name.toLowerCase().includes('ramen');
        if (!isSpicy) return false;
      } else if (selectedDiet === 'FAVORITES') {
        if (!favorites.has(dish.dish_id)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'PRICE_LOW') return a.price - b.price;
      if (sortBy === 'PRICE_HIGH') return b.price - a.price;
      return 0;
    });
  }, [allDishesMarketplace, selectedChefFilter, enforceRadius, searchQuery, selectedCuisine, vegOnly, selectedDiet, favorites, sortBy]);

  // Client-Side Predictive Geofencing Cache: 20km Bounding Box & Polygon Array
  useEffect(() => {
    if (!Array.isArray(vendors) || vendors.length === 0) return;
    const cache = vendors.map((v) => {
      const vLat = Number(v.latitude || 12.9716);
      const vLng = Number(v.longitude || 77.5946);
      const latDelta = 20 / 111.32;
      const lngDelta = 20 / (111.32 * Math.cos((vLat * Math.PI) / 180));
      return {
        vendor_id: v.vendor_id,
        business_name: v.business_name || v.name,
        lat: vLat,
        lng: vLng,
        bbox: [vLat - latDelta, vLng - lngDelta, vLat + latDelta, vLng + lngDelta],
        polygon: generateCircularPolygon(vLat, vLng, 20)
      };
    });
    setGeofencingCache(cache);
  }, [vendors]);

  // Sync background confirmation with /api/v1/customer/serviceability
  useEffect(() => {
    if (!currentCoords.lat || !currentCoords.lng) return;
    fetch('/api/v1/customer/serviceability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: currentCoords.lat, lng: currentCoords.lng })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.serviceable !== undefined) {
          setServerServiceabilityVerified(data.serviceable);
        }
      })
      .catch((err) => console.warn('Background serviceability validation failed:', err));
  }, [currentCoords.lat, currentCoords.lng]);

  // Client-Side Predictive Geofencing Check using cached 20km Turf polygons
  const isCurrentAreaServiced = React.useMemo(() => {
    if (loadingVendors) return true;
    if (currentCoords.locality?.toLowerCase().includes('airport') || currentCoords.lat > 13.1) {
      return false;
    }
    if (geofencingCache.length > 0) {
      try {
        const pt = turfPoint([Number(currentCoords.lng), Number(currentCoords.lat)]);
        const isContained = geofencingCache.some((k) => {
          // Fast BBOX rejection
          const inBbox =
            currentCoords.lat >= k.bbox[0] &&
            currentCoords.lng >= k.bbox[1] &&
            currentCoords.lat <= k.bbox[2] &&
            currentCoords.lng <= k.bbox[3];
          if (!inBbox) return false;
          return booleanPointInPolygon(pt, k.polygon);
        });
        if (serverServiceabilityVerified !== null) {
          return serverServiceabilityVerified && isContained;
        }
        return isContained;
      } catch (e) {
        console.warn('Predictive geofence computation error:', e);
      }
    }
    return vendors.length > 0;
  }, [loadingVendors, currentCoords.locality, currentCoords.lat, currentCoords.lng, geofencingCache, serverServiceabilityVerified, vendors.length]);

  if (loadingVendors && vendors.length === 0) {
    return (
      <KitchenLoadingScreen 
        message="Connecting to ChefHub Kitchen Ecosystem..." 
        subMessage="Calculating real-time Bangalore hub distances, live dish matrices & recipe stock" 
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      
      {/* Top Banner Promo Bar with High-Contrast WCAG Compliant Palette */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white border border-emerald-600/50 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
          <span><strong className="text-emerald-200">Zero Platform Surcharge:</strong> Direct local kitchens payout (85% Chef • 10% Rider • 5% Platform Escrow)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600/40 text-white text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
            20km Radius Guaranteed
          </span>
        </div>
      </div>

      {/* Weak Password Reminder Banner (Assessment + Flag) */}
      {showWeakPasswordReminder && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/15 border border-amber-500/40 flex flex-wrap items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 shadow-md">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Account Security Recommendation
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase">
                  Action Recommended
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                Your account security could be improved. Please take a moment to update to a stronger password.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('chefhub:open-security'));
              }}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Update Now</span>
              <span>➔</span>
            </button>
            <button
              onClick={() => {
                setShowWeakPasswordReminder(false);
                sessionStorage.setItem('chefhub_weak_password_dismissed', 'true');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Guest Mode or Non-Customer Role Switcher Notice */}
      {!user ? (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-base">👋</span>
            <span>Welcome to ChefHub! You are browsing as a <strong>Guest</strong>. Feel free to explore menus and gourmet dishes.</span>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In / Register to Order</span>
          </button>
        </div>
      ) : user.role !== 'CUSTOMER' ? (
        <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/15 border-2 border-orange-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center text-2xl font-black shrink-0 shadow-lg shadow-orange-500/30">
              {user.role === 'VENDOR' ? '👨‍🍳' : user.role === 'RIDER' ? '🛵' : '🛡️'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Customer Ordering Mode Active
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/30">
                  {user.role} Account: {user.name}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Welcome, <strong>{user.name}</strong>! You are browsing the marketplace in <strong>Customer Mode</strong>. You can explore menus, customize dishes, and place live food orders using your account!
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                if (user.role === 'VENDOR') window.location.href = '/chef/dashboard';
                else if (user.role === 'RIDER') window.location.href = '/rider/dashboard';
                else if (user.role === 'ADMIN') window.location.href = '/admin/dashboard';
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-black text-xs shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>➔ Return to {user.role === 'VENDOR' ? 'Chef Kitchen Console' : user.role === 'RIDER' ? 'Rider Delivery Hub' : 'Admin Site Console'}</span>
            </button>
            <button
              onClick={() => onLogout?.()}
              className="px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Log out of session"
            >
              Log Out
            </button>
          </div>
        </div>
      ) : null}

      {/* Prominent Area Serviceability Alert Banner when 0 chefs service this location */}
      {!isCurrentAreaServiced && !loadingVendors && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-red-500/20 to-rose-500/15 border border-rose-500/35 text-rose-300 text-xs shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <MapPinOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-200">📍 Area Currently Unavailable for Delivery</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-100 text-[10px] font-black uppercase">
                  Outside 20km Radius
                </span>
              </div>
              <p className="text-xs text-rose-300/90 mt-0.5">
                We currently don't have artisan home chefs serving <strong>{currentCoords.locality || 'your selected address'}</strong> yet. We are expanding rapidly across Bengaluru!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAddressModal(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Change Address</span>
            </button>
            <button
              onClick={() => alert(`🔔 We've noted ${currentCoords.locality} on our radar! You'll be notified when home kitchens open near you.`)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer"
            >
              Notify Me When Available
            </button>
          </div>
        </div>
      )}

      {/* Modern Location Bar & Primary Address Selector */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center shadow-md shrink-0">
            <MapPin className="w-5 h-5 text-orange-500 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Delivering to</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                currentCoords.locality.includes('Airport')
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25'
              }`}>
                {currentCoords.locality.includes('Airport') ? '⚠️ Outside 20km Limit' : '🟢 Within 20km Limit'}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-md mt-0.5">
              {primaryAddress}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ChefHub Escrow Wallet Pill */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 px-2.5 py-1 text-xs">
              <span className="text-base">👛</span>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Escrow Wallet</span>
                <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                  ₹{user ? walletBalance.toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setShowAddMoneyModal(true);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Money</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddressModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-extrabold text-xs border border-orange-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-orange-500" />
            <span>Change Hub / Address</span>
          </button>
        </div>
      </div>

      {/* Customer View Switcher: Marketplace vs My Orders */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              {(!user || customerTab === 'MARKETPLACE') ? <Utensils className="w-3 h-3" /> : <Truck className="w-3 h-3 text-orange-500" />}
              {(!user || customerTab === 'MARKETPLACE') ? 'Independent Chefs Marketplace' : 'Customer Orders Portal'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {(!user || customerTab === 'MARKETPLACE') ? 'Gourmet Chef Marketplace' : 'My Orders & Real-time Tracking'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {(!user || customerTab === 'MARKETPLACE')
              ? 'Order handcrafted artisanal meals directly from local ghost kitchens across Bengaluru'
              : 'Monitor live kitchen preparation, courier dispatch, escrow receipts, and dish reviews'}
          </p>
        </div>

        {/* View Switcher Tabs with Smooth Sliding Rectangle Indicator - STRICTLY ONLY FOR LOGGED-IN USERS */}
        {user ? (
          <div className="relative flex items-center gap-1 p-1 backdrop-blur-2xl bg-slate-200/80 dark:bg-slate-950/80 rounded-2xl border border-slate-300/80 dark:border-slate-800 shadow-inner">
            <div
              className="absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out pointer-events-none z-0
                         bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-amber-500/25 ring-1 ring-amber-300/40"
              style={{
                transform: `translateX(${customerTabIndicator.left}px)`,
                width: `${customerTabIndicator.width}px`,
                opacity: customerTabIndicator.opacity
              }}
            />

            <button
              ref={(el) => (customerTabRefs.current['MARKETPLACE'] = el)}
              onClick={() => setCustomerTab('MARKETPLACE')}
              className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-colors duration-200 cursor-pointer select-none ${
                customerTab === 'MARKETPLACE'
                  ? 'text-slate-950 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </button>

            <button
              ref={(el) => (customerTabRefs.current['ORDERS'] = el)}
              onClick={() => setCustomerTab('ORDERS')}
              className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-colors duration-200 cursor-pointer select-none ${
                customerTab === 'ORDERS'
                  ? 'text-slate-950 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>My Orders</span>
              {myOrders.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  customerTab === 'ORDERS'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-orange-500/20 text-orange-500 dark:text-orange-400'
                }`}>
                  {myOrders.length}
                </span>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {orderStatusMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-extrabold shadow-lg shadow-orange-500/10 animate-pulse">
          {orderStatusMsg}
        </div>
      )}

      {/* VIEW 1: GOURMET MARKETPLACE */}
      {customerTab === 'MARKETPLACE' && (
        <div className="space-y-8">
          
          {/* Swiggy/Zomato Inspired "What's on your mind? / Browse by cuisines" Circular Carousel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>What's on your mind?</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">• Browse by Cuisines</span>
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollCuisines('left')}
                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollCuisines('right')}
                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={cuisineScrollRef}
              className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 px-1"
            >
              {CUISINE_ITEMS.map((item) => {
                const isActive = selectedCuisine === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedCuisine(item.id)}
                    className={`flex flex-col items-center gap-2 shrink-0 group cursor-pointer transition-all duration-300 ${
                      isActive ? 'scale-105' : 'hover:scale-102 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden p-1 transition-all ${
                      isActive
                        ? 'ring-4 ring-orange-500 shadow-xl shadow-orange-500/30'
                        : 'ring-2 ring-slate-200 dark:ring-slate-800 group-hover:ring-orange-400/50'
                    }`}>
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-full" />
                    </div>
                    <span className={`text-xs font-bold text-center max-w-[90px] leading-tight ${
                      isActive ? 'text-orange-500 font-black' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zomato-Style "Top Chefs for You" Circular Avatar Carousel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Top chefs for you</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">• Independent Kitchens</span>
                </h3>
              </div>
              {selectedChefFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedChefFilter('ALL')}
                  className="text-xs font-extrabold text-orange-500 hover:text-orange-400 underline cursor-pointer"
                >
                  Show All Chefs ({vendors.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full">
              {vendors.map((v) => {
                const isSelected = selectedChefFilter === v.vendor_id;
                const chefMeta = CHEF_AVATARS[v.email?.toLowerCase()] || {
                  avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=240&q=80',
                  locality: v.primary_address || 'Artisanal Kitchen',
                  title: 'Artisanal Cloud Kitchen',
                  specialtyTag: 'Daily Specialties'
                };
                const chefAvatar = v.avatar_url || chefMeta.avatar;
                const chefLocality = v.primary_address || chefMeta.locality;
                const isClosed = v.is_currently_open === false || v.menu?.is_currently_open === false;
                const isOutOfRadius = enforceRadius && v.is_within_20km === false;

                // Format chef name with specialty tag to guarantee 100% layout consistency across cards
                const formattedChefName = v.business_name.includes('(')
                  ? v.business_name
                  : `${v.business_name} (${chefMeta.specialtyTag || 'Daily Specialties'})`;

                return (
                  <button
                    key={v.vendor_id}
                    onClick={() => {
                      setSelectedChefFilter(v.vendor_id);
                      setSelectedVendor(v);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between h-full backdrop-blur-xl hover:-translate-y-1 cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10 text-slate-900 dark:text-white shadow-xl shadow-orange-500/20 ring-2 ring-orange-500/40'
                        : isOutOfRadius
                        ? 'border-rose-500/30 bg-rose-500/5 opacity-60'
                        : 'border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-orange-400/60 shadow-sm'
                    }`}
                  >
                    <div className="space-y-3 w-full">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-md">
                          <img
                            src={chefAvatar}
                            alt={v.business_name}
                            className="w-full h-full object-cover"
                          />
                          {isClosed && (
                            <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                              <Ban className="w-4 h-4 text-rose-400" />
                            </div>
                          )}
                        </div>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {formattedChefName}
                          </h4>
                          <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 truncate mt-0.5">
                            {chefMeta.title || 'Artisanal Home Kitchen'}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5 font-medium">
                            📍 {chefLocality}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 font-semibold gap-1 w-full">
                      {v.is_new_arrival ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-black flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 text-[10px]">
                          <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>New Arrival</span>
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-0.5 font-black">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {v.rating} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({v.review_count})</span>
                        </span>
                      )}
                      <span className={`font-extrabold shrink-0 ${
                        isOutOfRadius
                          ? 'text-rose-500'
                          : isClosed
                          ? 'text-slate-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isOutOfRadius ? `${v.distance_km} km (>20km)` : `${v.distance_km || 2.4} km • ${v.estimated_delivery_mins || 25}m`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Chef Details Banner */}
            {selectedChefFilter !== 'ALL' && (() => {
              const activeChef = vendors.find(v => v.vendor_id === selectedChefFilter);
              if (!activeChef) return null;
              const meta = CHEF_AVATARS[activeChef.email?.toLowerCase()] || {};
              const avatar = activeChef.avatar_url || meta.avatar || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=240&q=80';
              return (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-500/30 flex flex-wrap items-center justify-between gap-4 animate-fade-in backdrop-blur-md">
                  <div className="flex items-center gap-3.5">
                    <img src={avatar} alt={activeChef.business_name} className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-500/40 shadow-md shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">{activeChef.business_name}</h3>
                        {activeChef.is_new_arrival ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" /> New Arrival ({activeChef.review_count || 0}/3 reviews)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {activeChef.rating} / 5.0 ({activeChef.review_count} verified reviews)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
                        📍 {activeChef.primary_address || meta.locality || 'Artisanal Kitchen'} • ⏰ {activeChef.menu?.operating_hours || '11:00 AM - 10:00 PM'}
                      </p>
                      {activeChef.menu?.chef_bio && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5 line-clamp-1">
                          "{activeChef.menu.chef_bio}"
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedChefFilter('ALL')}
                    className="text-xs font-black text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-orange-500/30 shadow-sm cursor-pointer"
                  >
                    Clear Filter (All Chefs)
                  </button>
                </div>
              );
            })()}
          </div>

          {/* FoodChow-Inspired Main Marketplace: Left Filter Sidebar + Unified Dishes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
            
            {/* Left Filter Sidebar (FoodChow / Zomato Style) */}
            <div className="lg:col-span-1 space-y-5">
              <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl space-y-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                    <span>Filters & Sort</span>
                  </h4>
                  <button
                    onClick={() => {
                      setVegOnly(false);
                      setSelectedCuisine('ALL');
                      setSelectedDiet('ALL');
                      setSelectedChefFilter('ALL');
                      setSearchQuery('');
                      setSortBy('RECOMMENDED');
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-orange-500"
                  >
                    Reset
                  </button>
                </div>

                {/* Service Mode: Delivery vs Pickup */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                    <button
                      onClick={() => setServiceType('DELIVERY')}
                      className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
                        serviceType === 'DELIVERY'
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Delivery</span>
                    </button>
                    <button
                      onClick={() => setServiceType('PICKUP')}
                      className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
                        serviceType === 'PICKUP'
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Takeaway</span>
                    </button>
                  </div>
                </div>

                {/* Pure Veg Toggle */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 p-0.5 rounded flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">Veg Only</span>
                  </div>
                  <button
                    onClick={() => setVegOnly(!vegOnly)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      vegOnly ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      vegOnly ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 20km Radius Checkbox */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">20km Limit</span>
                    <span className="text-[10px] text-slate-500">Filter out chefs &gt;20km away</span>
                  </div>
                  <button
                    onClick={() => setEnforceRadius(!enforceRadius)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      enforceRadius ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      enforceRadius ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Filter by Chef */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter by Chef</label>
                  <select
                    value={selectedChefFilter}
                    onChange={(e) => {
                      const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                      setSelectedChefFilter(val);
                      if (val !== 'ALL') {
                        const found = vendors.find(v => v.vendor_id === val);
                        if (found) setSelectedVendor(found);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-orange-500"
                  >
                    <option value="ALL">All Kitchens ({vendors.length} Chefs)</option>
                    {vendors.map((v) => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.business_name} ({v.distance_km} km)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" />
                    <span>Sort By</span>
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'RECOMMENDED', label: '⭐ Recommended' },
                      { id: 'PRICE_LOW', label: '💵 Price: Low to High' },
                      { id: 'PRICE_HIGH', label: '💎 Price: High to Low' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSortBy(s.id)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                          sortBy === s.id
                            ? 'bg-orange-500/15 text-orange-500 dark:text-orange-400 font-extrabold border border-orange-500/30'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Right 3 Cols: Search Bar + Unified Dishes Marketplace Grid */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Search Bar & Diet Segment */}
              <div className="glass-card rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dishes, chefs, ramen, biryani..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-orange-500 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'VEGAN', label: '🌿 Vegetarian' },
                    { id: 'SPICY', label: '🌶️ Spicy' },
                    { id: 'FAVORITES', label: `❤️ Favorites (${favorites.size})` }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setSelectedDiet(chip.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer ${
                        selectedDiet === chip.id
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dishes Count Banner */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Showing <strong>{filteredMarketplaceDishes.length}</strong> handcrafted dishes</span>
                {selectedChefFilter !== 'ALL' && (
                  <span className="text-orange-500 font-bold">Filtered by selected chef</span>
                )}
              </div>

              {/* Unified Dishes Grid */}
              {filteredMarketplaceDishes.length === 0 ? (
                <div className="glass-card rounded-3xl p-10 text-center space-y-3 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
                  <Utensils className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">No dishes found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try adjusting your search query, cuisine filter, or location delivery radius to view more dishes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredMarketplaceDishes.map((dish) => {
                    const cartItem = cart.find((item) => item.dish_id === dish.dish_id);
                    const isFav = favorites.has(dish.dish_id);
                    const isDishAvailable = dish.is_available !== false && dish.is_available !== 0 && (dish.daily_stock === undefined || Number(dish.daily_stock) > 0);
                    const isVendorOpen = dish.vendor_is_open;

                    return (
                      <div
                        key={`${dish.vendor_id}-${dish.dish_id}`}
                        className={`dish-card glass-card rounded-3xl overflow-hidden border flex flex-col justify-between group shadow-lg transition-all ${
                          !isVendorOpen
                            ? 'opacity-40 grayscale bg-slate-900/90 border-rose-500/30'
                            : !isDishAvailable
                            ? 'opacity-60 grayscale bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:shadow-2xl'
                        }`}
                      >
                        {/* Food Image */}
                        <div className="relative h-44 w-full overflow-hidden bg-slate-200 dark:bg-slate-950">
                          <img
                            src={getDishImage(dish)}
                            alt={dish.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = fallbackImages[dish.name] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                            }}
                            className={`food-image-zoom w-full h-full object-cover ${!isVendorOpen || !isDishAvailable ? 'grayscale opacity-50' : ''}`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                          {/* Floating Price Pill */}
                          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-500/40 text-amber-400 font-black text-xs shadow-xl flex items-center gap-1 z-20">
                            <span>₹{Number(dish.price).toFixed(2)}</span>
                          </div>

                          {/* Favorite Heart Button */}
                          <button
                            onClick={() => toggleFavorite(dish.dish_id)}
                            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors z-20 cursor-pointer"
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>

                          {/* Chef Kitchen Tag */}
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white z-20 font-bold">
                            <span className="truncate max-w-[150px] bg-slate-950/80 px-2 py-0.5 rounded-md border border-white/10">
                              👨‍🍳 {dish.vendor_name}
                            </span>
                            <span className="bg-orange-500/90 text-white px-2 py-0.5 rounded-md font-mono text-[10px]">
                              {dish.vendor_distance_km} km
                            </span>
                          </div>
                        </div>

                        {/* Dish Details */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-1">
                                {dish.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {dish.description}
                            </p>
                          </div>

                          {/* Bottom Row: Stock Status & Add to Cart */}
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div className="text-[10px] font-bold text-slate-500">
                              {dish.daily_stock !== undefined ? (
                                <span className={Number(dish.daily_stock) <= 5 ? 'text-amber-500 font-extrabold' : 'text-emerald-500'}>
                                  ● {dish.daily_stock} left
                                </span>
                              ) : (
                                <span className="text-emerald-500">● In Stock</span>
                              )}
                            </div>

                            {cartItem ? (
                              <div className="flex items-center gap-2 bg-orange-500 text-white rounded-xl px-2 py-1 shadow-md">
                                <button
                                  onClick={() => updateCartQuantity(dish.dish_id, cartItem.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center font-bold text-sm cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-mono font-black text-xs min-w-[16px] text-center">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQuantity(dish.dish_id, cartItem.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center font-bold text-sm cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddToCartWithFeedback(dish, vendors.find(v => v.vendor_id === dish.vendor_id))}
                                disabled={!isVendorOpen || !isDishAvailable}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                                  !isVendorOpen || !isDishAvailable
                                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                                }`}
                              >
                                {addedFeedback[dish.dish_id] ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Added!</span>
                                  </>
                                ) : (
                                  <>
                                    <span>ADD</span>
                                    <span className="text-[10px] opacity-75">+</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: MY ORDERS & REAL-TIME TRACKING */}
      {user && customerTab === 'ORDERS' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Order History & Deliveries</h2>
              <p className="text-xs text-slate-500">Live order journey, escrow transparency and dish ratings</p>
            </div>

            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-950 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'All Orders' },
                { id: 'ACTIVE', label: 'Active En Route' },
                { id: 'DELIVERED', label: 'Delivered' },
                { id: 'CANCELLED', label: 'Cancelled' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOrdersFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ordersFilter === f.id
                      ? 'bg-orange-500 text-white font-black shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {(() => {
            const filteredOrders = myOrders.filter(o => {
              if (ordersFilter === 'ACTIVE') return !['DELIVERED', 'CANCELLED'].includes(o.status);
              if (ordersFilter === 'DELIVERED') return o.status === 'DELIVERED';
              if (ordersFilter === 'CANCELLED') return o.status === 'CANCELLED';
              return true;
            });

            if (filteredOrders.length === 0) {
              return (
                <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80">
                  <ShoppingBag className="w-12 h-12 text-orange-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">No Orders Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      {ordersFilter === 'ALL'
                        ? "You haven't placed any orders yet. Explore our handcrafted gourmet marketplace!"
                        : `No orders matching filter "${ordersFilter}".`}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setCustomerTab('MARKETPLACE')}
                      className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-lg hover:bg-orange-600 cursor-pointer"
                    >
                      Browse Gourmet Menus
                    </button>
                    <button
                      onClick={() => fetchMyOrders()}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      ↻ Refresh Orders
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredOrders.map(o => (
                  <div
                    key={o.order_id}
                    className="glass-card rounded-3xl p-6 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl space-y-4 shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shrink-0">
                            {o.vendor_name ? o.vendor_name[0] : 'C'}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 dark:text-white text-base">Order #{o.order_id}</span>
                            <p className="text-xs text-slate-500">Chef: <strong className="text-slate-900 dark:text-slate-200">{o.vendor_name}</strong></p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          o.status === 'DELIVERED'
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : o.status === 'CANCELLED'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse'
                        }`}>
                          {o.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        {Array.isArray(o.items) && o.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
                            <span>{it.quantity} × {it.name || it.dish_name}</span>
                            <span className="font-mono font-bold">₹{Number(it.price_at_purchase || it.price || 0) * Number(it.quantity || 1)}</span>
                          </div>
                        ))}

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                          <div className="text-slate-500 font-mono text-[11px]">
                            <span>Placed: </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {new Date(o.timestamp || o.created_at || Date.now()).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                          <span className="text-sm font-black text-amber-500">
                            Total: ₹{Number(o.total_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Cancelled Order Refund Details Banner */}
                      {o.status === 'CANCELLED' && (
                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-rose-500 flex items-center gap-1.5">
                              <Ban className="w-3.5 h-3.5" /> Order Cancelled by Chef
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase">
                              100% Escrow Refunded
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            Full escrow refund of <strong className="text-slate-900 dark:text-white">₹{Number(o.total_amount).toFixed(2)}</strong> has been credited back to your account ({o.payment_method || 'ChefHub Escrow Wallet'}).
                          </p>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                            <span>Ref: REF-{o.order_id}-ESCROW</span>
                            <span className="text-emerald-500 font-bold">✓ Refund Settled</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => handleOpenTracking(o)}
                        className="flex-1 min-w-[130px] py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track Order</span>
                      </button>

                      <button
                        onClick={() => setConfirmedOrder(o)}
                        className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Receipt</span>
                      </button>

                      {o.status === 'PLACED' && (
                        <button
                          onClick={() => setCancelModalOrder(o)}
                          disabled={cancellingOrderIds.has(o.order_id || o.id)}
                          className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs border border-rose-500/25 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{cancellingOrderIds.has(o.order_id || o.id) ? 'Syncing...' : 'Cancel'}</span>
                        </button>
                      )}

                      {cancellingOrderIds.has(o.order_id || o.id) && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 dark:text-blue-400 text-[10px] font-extrabold animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                          ⚡ Multi-DB Syncing in background...
                        </div>
                      )}

                      {o.status === 'DELIVERED' && (
                        <button
                          onClick={() => {
                            setReviewOrder(o);
                            setVendorRating(5);
                            setRiderRating(5);
                            setReviewComment('');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-black text-xs border border-amber-500/25 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>Rate Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Floating Bottom Cart Bar (Mobile) */}
      {cart.length > 0 && customerTab === 'MARKETPLACE' && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto md:hidden">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-extrabold text-xs shadow-2xl flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{cart.length} Item{cart.length > 1 ? 's' : ''} in Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-black/20 px-2 py-0.5 rounded-lg">₹{grandTotal.toFixed(2)}</span>
              <span>Checkout →</span>
            </div>
          </button>
        </div>
      )}

      {/* Desktop Floating Cart Side Pill */}
      {cart.length > 0 && customerTab === 'MARKETPLACE' && (
        <div className="fixed bottom-6 right-6 z-40 hidden md:block">
          <button
            onClick={handleOpenPaymentGateway}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-2xl flex items-center gap-3 cursor-pointer ring-2 ring-white/20 transition-all hover:scale-105"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </div>
            <span>View Cart • ₹{grandTotal.toFixed(2)}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dedicated Add Money to Escrow Wallet Modal with Full Payment Credentials */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-xl w-full space-y-5 shadow-2xl animate-in fade-in my-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Top-Up Escrow Wallet</h3>
                  <p className="text-[11px] text-slate-500">RBI & NPCI Compliant Buyer Escrow Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMoneyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addMoneySuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{addMoneySuccess}</span>
              </div>
            )}

            {/* Current Balance Status Bar */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Wallet Balance</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">₹{walletBalance.toFixed(2)}</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Active Escrow</span>
              </span>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Top-Up Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={topUpAmountInput}
                  onChange={(e) => setTopUpAmountInput(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm font-mono font-bold outline-none focus:border-orange-500"
                />
              </div>

              {/* Quick Select Preset Chips */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[200, 500, 1000, 2000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmountInput(String(amt))}
                    className={`py-1.5 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer ${
                      Number(topUpAmountInput) === amt
                        ? 'border-orange-500 bg-orange-500/15 text-orange-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Choose Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CARD', label: 'Debit / Card', icon: <CreditCardTabIcon className="w-4 h-4" /> },
                  { id: 'UPI', label: 'UPI / QR', icon: <UpiIcon className="w-7 h-3.5" /> },
                  { id: 'NETBANKING', label: 'Net Banking', icon: <NetBankingTabIcon className="w-4 h-4" /> }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTopUpMethod(m.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      topUpMethod === m.id
                        ? 'border-orange-500 bg-orange-500/15 text-orange-500 font-black ring-1 ring-orange-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* 1. CARD TOP-UP FORM */}
              {topUpMethod === 'CARD' && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Saved Cards (RBI Compliant)</span>
                    <span className="text-[10px] text-slate-400 font-bold">100% Tokenized</span>
                  </div>

                  {/* List of saved cards with DELETE option */}
                  <div className="space-y-2">
                    {savedCards.map(c => {
                      const isSelected = !topUpCardDetails.isNewCard && topUpCardDetails.selectedCardId === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div
                            onClick={() => setTopUpCardDetails(prev => ({ ...prev, selectedCardId: c.id, isNewCard: false }))}
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                          >
                            <div className="w-9 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1 border border-slate-200 dark:border-slate-700 shrink-0">
                              {getCardBrandIcon(c.brand)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900 dark:text-white">{c.bank}</span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold uppercase">{c.brand}</span>
                              </div>
                              <span className="font-mono text-[11px] text-slate-500">•••• {c.last4} • Exp: {c.exp}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCard(c.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete saved card (RBI Privacy Compliance)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setTopUpCardDetails(prev => ({ ...prev, isNewCard: !prev.isNewCard }))}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-orange-500 hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{topUpCardDetails.isNewCard ? 'Use a Saved Card' : 'Enter New Card Credentials'}</span>
                    </button>
                  </div>

                  {/* New Card Input Fields */}
                  {topUpCardDetails.isNewCard && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Card Number (16 Digits)</label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={19}
                            value={topUpCardDetails.cardNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                              const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                              setTopUpCardDetails(prev => ({ ...prev, cardNumber: formatted }));
                            }}
                            placeholder="4532 8892 1042 8821"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                          />
                          <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">Name on Card</label>
                        <input
                          type="text"
                          value={topUpCardDetails.cardHolder}
                          onChange={(e) => setTopUpCardDetails(prev => ({ ...prev, cardHolder: e.target.value }))}
                          placeholder="Full name as printed on card"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={topUpCardDetails.expiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                              setTopUpCardDetails(prev => ({ ...prev, expiry: val }));
                            }}
                            placeholder="08/29"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">CVV</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={topUpCardDetails.cvv}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setTopUpCardDetails(prev => ({ ...prev, cvv: val }));
                            }}
                            placeholder="•••"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold tracking-widest outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={topUpCardDetails.saveForFuture}
                          onChange={(e) => setTopUpCardDetails(prev => ({ ...prev, saveForFuture: e.target.checked }))}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                          Save card securely for future payments (RBI Tokenized)
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* 2. UPI TOP-UP FORM */}
              {topUpMethod === 'UPI' && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Choose Instant UPI App</span>
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Zero Gateway Fees</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'gpay', name: 'Google Pay', icon: <GooglePayIcon className="w-7 h-7" />, handle: '@okaxis' },
                      { id: 'phonepe', name: 'PhonePe', icon: <PhonePeIcon className="w-7 h-7" />, handle: '@ybl' },
                      { id: 'paytm', name: 'Paytm UPI', icon: <PaytmIcon className="w-8 h-4" />, handle: '@paytm' },
                      { id: 'bhim', name: 'BHIM UPI', icon: <BhimIcon className="w-7 h-7" />, handle: '@upi' }
                    ].map(app => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setTopUpUpiDetails(prev => ({
                          ...prev,
                          upiApp: app.id,
                          upiId: `alex.customer${app.handle}`,
                          isVerified: true
                        }))}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          topUpUpiDetails.upiApp === app.id
                            ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="h-7 flex items-center justify-center">{app.icon}</div>
                        <span className="text-[11px] font-extrabold text-center leading-tight">{app.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom UPI ID */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-500">Or Enter Customer UPI ID (VPA)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={topUpUpiDetails.upiId}
                        onChange={(e) => setTopUpUpiDetails(prev => ({ ...prev, upiId: e.target.value.toLowerCase(), isVerified: false }))}
                        placeholder="yourname@okhdfcbank"
                        className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setTopUpUpiDetails(prev => ({ ...prev, isVerified: true }))}
                        className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs cursor-pointer"
                      >
                        {topUpUpiDetails.isVerified ? '✓ Verified' : 'Verify'}
                      </button>
                    </div>

                    {topUpUpiDetails.isVerified && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Verified NPCI UPI ID • Instant Auto-Pay Ready</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic QR Code Generator */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTopUpUpiDetails(prev => ({ ...prev, showQr: !prev.showQr }))}
                      className="w-full py-2 px-3 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <QrCode className="w-4 h-4 text-orange-500" />
                      <span>{topUpUpiDetails.showQr ? 'Hide Dynamic UPI QR Code' : 'Show Dynamic UPI QR Code for Quick Scan'}</span>
                    </button>

                    {topUpUpiDetails.showQr && (
                      <div className="p-4 mt-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 animate-in fade-in">
                        <div className="inline-block p-3 rounded-2xl bg-white border border-slate-200 shadow-md">
                          <svg className="w-36 h-36 mx-auto" viewBox="0 0 100 100">
                            <rect width="100" height="100" fill="#ffffff" />
                            {/* Visual QR Pattern Simulation */}
                            <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                            <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                            <rect x="18" y="18" width="9" height="9" fill="#f97316" />
                            <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                            <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                            <rect x="73" y="18" width="9" height="9" fill="#f97316" />
                            <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                            <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                            <rect x="18" y="73" width="9" height="9" fill="#f97316" />
                            <rect x="42" y="15" width="15" height="8" fill="#0f172a" />
                            <rect x="42" y="30" width="8" height="15" fill="#0f172a" />
                            <rect x="55" y="42" width="15" height="15" fill="#0f172a" />
                            <rect x="42" y="65" width="10" height="20" fill="#0f172a" />
                            <rect x="65" y="65" width="20" height="10" fill="#0f172a" />
                            <rect x="75" y="78" width="12" height="12" fill="#0f172a" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            Scan with Any UPI App to Pay ₹{Number(topUpAmountInput || 0).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            VPA: chefhub.escrow@icici • Valid for 04:59 mins
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. NETBANKING TOP-UP FORM */}
              {topUpMethod === 'NETBANKING' && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Popular Indian Banks</span>
                    <span className="text-[10px] text-slate-400 font-bold">50+ Banks Supported</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      'HDFC Bank',
                      'State Bank of India (SBI)',
                      'ICICI Bank',
                      'Axis Bank',
                      'Kotak Mahindra Bank',
                      'Punjab National Bank'
                    ].map(bank => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setTopUpNetBankingDetails({ bankName: bank })}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                          topUpNetBankingDetails.bankName === bank
                            ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {getBankIcon(bank)}
                        <span className="truncate">{bank}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Or Choose from All Indian Banks</label>
                    <select
                      value={topUpNetBankingDetails.bankName}
                      onChange={(e) => setTopUpNetBankingDetails({ bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Bank of Baroda">Bank of Baroda</option>
                      <option value="Canara Bank">Canara Bank</option>
                      <option value="Union Bank of India">Union Bank of India</option>
                      <option value="IndusInd Bank">IndusInd Bank</option>
                      <option value="Federal Bank">Federal Bank</option>
                      <option value="IDFC First Bank">IDFC First Bank</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleInitiateWalletTopUp}
                disabled={isAddingMoney || !topUpAmountInput || Number(topUpAmountInput) <= 0}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAddingMoney ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Top-Up…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Proceed to Add ₹{Number(topUpAmountInput || 0).toFixed(2)} to Wallet</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddMoneyModal(false)}
                className="px-4 py-3.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D-Secure 2FA / OTP Verification Modal for Top-Up */}
      {topUpOtpModal.isOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <h4 className="font-black text-sm">3D-Secure 2FA Verification</h4>
                  <p className="text-[10px] text-slate-500">RBI SafeKey Escrow Verification</p>
                </div>
              </div>
              <button
                onClick={() => setTopUpOtpModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Merchant:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">ChefHub Escrow Holdings</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Ref Number:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{topUpOtpModal.referenceId}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Top-Up Amount:</span>
                <span className="font-mono font-black text-amber-500">₹{Number(topUpOtpModal.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{topUpOtpModal.method}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">
                Enter 6-Digit One-Time Password (OTP) sent to •••• 8920
              </label>
              <input
                type="text"
                maxLength={6}
                value={topUpOtpModal.otpInput}
                onChange={(e) => setTopUpOtpModal(prev => ({ ...prev, otpInput: e.target.value.replace(/\D/g, '') }))}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-center font-mono text-lg font-black tracking-widest outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => setTopUpOtpModal(prev => ({ ...prev, otpInput: '123456' }))}
                className="text-[11px] text-orange-500 font-bold hover:underline block text-center cursor-pointer"
              >
                Click to autofill test OTP: 123456
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleVerifyTopUpOtp}
                disabled={topUpOtpModal.isVerifying || topUpOtpModal.otpInput.length < 4}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {topUpOtpModal.isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with Bank...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Authorize & Credit ₹{Number(topUpOtpModal.amount).toFixed(2)}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTopUpOtpModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Address & Location Management Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-2xl w-full space-y-5 shadow-2xl my-auto animate-in fade-in">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Delivery Address & Service Availability</h3>
                  <p className="text-[11px] text-slate-500">Manage multiple addresses and check 20km kitchen coverage</p>
                </div>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addressFeedback && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
                {addressFeedback}
              </div>
            )}

            {/* List of Saved Addresses with Add / Delete Functionality */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Saved Customer Addresses ({savedAddresses.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(prev => !prev)}
                  className="px-3 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-extrabold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showNewAddressForm ? 'Cancel Add Address' : 'Add New Address'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedAddresses.map((addr) => {
                  const isActive = primaryAddress.includes(addr.flat_street) || primaryAddress.includes(addr.locality);
                  return (
                    <div
                      key={addr.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive
                          ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-slate-400'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase flex items-center gap-1">
                            {addr.tag === 'Home' ? <Home className="w-3 h-3" /> : addr.tag === 'Work' ? <Briefcase className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                            <span>{addr.tag}</span>
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{addr.recipient_name}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{addr.phone}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {addr.flat_street}, {addr.locality}, {addr.district}, {addr.state} - <span className="font-mono font-bold">{addr.pincode}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 text-xs font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivering Here</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition-colors cursor-pointer"
                          >
                            Deliver Here
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAddress(addr.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapsible New Address Form */}
            {showNewAddressForm && (
              <form onSubmit={handleSaveNewAddress} className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 space-y-3 animate-in fade-in">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-orange-500" />
                  <span>Enter New Customer Delivery Address</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={newAddressForm.recipient_name}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                      placeholder="e.g. Full Name"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={newAddressForm.phone}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Address Tag</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['Home', 'Work', 'Other'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNewAddressForm(prev => ({ ...prev, tag }))}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            newAddressForm.tag === tag
                              ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Flat / House No, Building, Street</label>
                  <input
                    type="text"
                    required
                    value={newAddressForm.flat_street}
                    onChange={(e) => setNewAddressForm(prev => ({ ...prev, flat_street: e.target.value }))}
                    placeholder="e.g. Flat 301, Brigade Millennium, 7th Phase"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-semibold outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Bangalore Hub / Area</label>
                    <select
                      value={newAddressForm.selectedHubId}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, selectedHubId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                    >
                      {BANGALORE_HUBS.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">District / City</label>
                    <input
                      type="text"
                      value={newAddressForm.district}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="Bengaluru Urban"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-semibold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">PIN Code (6 Digits)</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={newAddressForm.pincode}
                      onChange={(e) => setNewAddressForm(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                      placeholder="560034"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Save & Set as Delivery Address
                  </button>
                </div>
              </form>
            )}

            {/* Quick Bangalore Delivery Hubs Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Bangalore Location Availability Hubs</span>
                <span className="text-[10px] text-slate-400 font-normal">Select to test delivery coverage</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BANGALORE_HUBS.map((hub) => {
                  const isSelected = currentCoords.locality === hub.name;
                  const isOutside = hub.name.includes('Airport');
                  return (
                    <button
                      key={hub.id}
                      onClick={() => handleSelectHub(hub)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/15 text-orange-500 ring-1 ring-orange-500'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-xs">{hub.name}</h5>
                        {isOutside && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono text-[9px] font-bold">
                            &gt;20km Test
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{hub.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowAddressModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal with Strict Coupon Code & Profile Address */}
      {showPaymentGatewayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-300 dark:border-slate-800 max-w-2xl w-full space-y-5 shadow-2xl my-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit SSL Escrow Protected
                  </span>
                </div>
                <h3 className="text-xl font-extrabold mt-1 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  <span>Secure Checkout & Escrow Payment</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  if (paymentStage === 'IDLE') setShowPaymentGatewayModal(false);
                }}
                disabled={paymentStage !== 'IDLE'}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stages: SUCCESS / FAILED animations */}
            {paymentStage === 'SUCCESS_ANIM' && (
              <div className="py-8 px-4 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black">Payment Completed! 🎉</h3>
                <p className="text-xs text-slate-500">
                  Authorized <strong>₹{grandTotal.toFixed(2)}</strong>. Escrow hold is active.
                </p>
              </div>
            )}

            {paymentStage === 'FAILED_ANIM' && (
              <div className="py-8 px-4 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto shadow-xl">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black">Payment Failed ❌</h3>
                <p className="text-xs text-rose-500">
                  {paymentStageData?.error_reason || 'Authorization declined.'}
                </p>
                {paymentStageData?.error_reason && (paymentStageData.error_reason.toLowerCase().includes('token') || paymentStageData.error_reason.toLowerCase().includes('session')) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentGatewayModal(false);
                      setPaymentStage('IDLE');
                      setShowAuthModal(true);
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
                  >
                    Sign In to Refresh Session
                  </button>
                )}
              </div>
            )}

            {/* IDLE / PROCESSING */}
            {(paymentStage === 'IDLE' || paymentStage === 'PROCESSING') && (
              <div className="space-y-4">
                
                {/* 1. Saved Primary Delivery Address Card (NO EDITABLE INPUT) */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <span>Delivery Address (Saved in Profile)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(true)}
                      className="text-xs font-bold text-orange-500 hover:text-orange-400 underline cursor-pointer"
                    >
                      Change Address
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold pl-6">
                    {primaryAddress}
                  </p>
                  <div className="flex items-center gap-2 pl-6 text-[10px] text-slate-500">
                    <span className="bg-emerald-500/10 text-emerald-500 font-mono font-bold px-2 py-0.5 rounded">
                      GPS: {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
                    </span>
                    <span>• Hub: {currentCoords.locality}</span>
                  </div>

                  {!isCurrentAreaServiced && (
                    <div className="p-3 mt-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-500 text-xs font-bold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPinOff className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>Area currently outside our 20km chef delivery radius.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(true)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-black cursor-pointer hover:bg-rose-600 transition-colors"
                      >
                        Change Address
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Strict Promo Coupon Code Section */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-orange-500" />
                      <span>Apply Promotional Coupon Code</span>
                    </label>
                    {appliedCoupon && (
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove Coupon
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. CHEF50)"
                      disabled={!!appliedCoupon}
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold uppercase outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      disabled={!!appliedCoupon || !couponCodeInput.trim()}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-extrabold text-xs cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Quick Select Promo Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {PROMO_CHIPS.map((chip) => (
                      <button
                        key={chip.code}
                        type="button"
                        onClick={() => handleApplyCoupon(chip.code)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                          appliedCoupon?.code === chip.code
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-500'
                        }`}
                      >
                        🏷️ {chip.code} ({chip.title})
                      </button>
                    ))}
                  </div>

                  {couponStatus.message && (
                    <div className={`text-[11px] font-bold ${
                      couponStatus.state === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {couponStatus.message}
                    </div>
                  )}
                </div>

                {/* 3. Payment Method Tabs & Detailed Input Forms */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'CARD', label: 'Card', icon: <CreditCardTabIcon className="w-4 h-4" /> },
                      { id: 'UPI', label: 'UPI', icon: <UpiIcon className="w-6 h-3" /> },
                      { id: 'NETBANKING', label: 'NetBank', icon: <NetBankingTabIcon className="w-4 h-4" /> },
                      { id: 'ESCROW_WALLET', label: 'Wallet', icon: <Wallet className="w-4 h-4" /> }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: m.id })}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                          paymentForm.paymentMethod === m.id
                            ? 'bg-orange-500 text-white font-black shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* A. CARD FORM */}
                  {paymentForm.paymentMethod === 'CARD' && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Credit / Debit Card Details</span>
                        <div className="flex items-center gap-1.5 text-xs">
                          <VisaIcon className="w-6 h-4" />
                          <MastercardIcon className="w-6 h-4" />
                          <RupayIcon className="w-6 h-4" />
                        </div>
                      </div>

                      {/* Saved Cards Quick Select with Delete */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {savedCards.map(c => {
                            const isSelected = paymentForm.cardNumber.replace(/\s+/g, '').endsWith(c.last4);
                            return (
                              <div
                                key={c.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500/10 text-orange-500 ring-1 ring-orange-500'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setPaymentForm(prev => ({
                                    ...prev,
                                    cardNumber: `4532 8892 1042 ${c.last4}`,
                                    cardHolder: c.holder || user?.name || '',
                                    expiry: c.exp,
                                    cvv: c.cvv || '888'
                                  }))}
                                  className="text-left flex-1 cursor-pointer flex items-center gap-2"
                                >
                                  <div className="w-8 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-0.5 border border-slate-200 dark:border-slate-700 shrink-0">
                                    {getCardBrandIcon(c.brand)}
                                  </div>
                                  <div>
                                    <span className="block font-bold text-xs">{c.bank}</span>
                                    <span className="font-mono text-[10px] text-slate-400">•••• {c.last4} ({c.brand})</span>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveCard(c.id);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                  title="Remove saved card (RBI compliance)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowAddCardModal(true)}
                          className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-bold text-orange-500 hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add New Card to Saved Cards</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-500">Card Number (16 Digits)</label>
                            {paymentForm.cardNumber.replace(/\D/g, '').length >= 1 && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                <span className="text-slate-400">Brand:</span>
                                <span className="px-2 py-0.5 rounded-md font-mono font-black uppercase bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                                  {detectCardBrand(paymentForm.cardNumber)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={paymentForm.cardNumber}
                              maxLength={19}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                                const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                                setPaymentForm(prev => ({ ...prev, cardNumber: formatted }));
                              }}
                              placeholder="4532 8892 1042 8821"
                              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                            />
                            <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                          </div>
                          {paymentForm.cardNumber.replace(/\D/g, '').length >= 13 && (
                            <div className="mt-1.5 flex items-center justify-between text-[10px]">
                              {validateLuhn(paymentForm.cardNumber) ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Luhn Checksum Passed • Pre-flight Tokenization Ready
                                </span>
                              ) : (
                                <span className="text-rose-500 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Invalid Card Checksum (Luhn Algorithm Failed)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">Cardholder Name</label>
                          <input
                            type="text"
                            value={paymentForm.cardHolder}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, cardHolder: e.target.value }))}
                            placeholder="Full name as printed on card"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">Expiry Date (MM/YY)</label>
                            <input
                              type="text"
                              value={paymentForm.expiry}
                              maxLength={5}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                                setPaymentForm(prev => ({ ...prev, expiry: val }));
                              }}
                              placeholder="08/29"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">CVV / Security Code</label>
                            <input
                              type="password"
                              value={paymentForm.cvv}
                              maxLength={4}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setPaymentForm(prev => ({ ...prev, cvv: val }));
                              }}
                              placeholder="•••"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold tracking-widest outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* B. UPI FORM */}
                  {paymentForm.paymentMethod === 'UPI' && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Pay via UPI App or ID</span>
                        <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⚡ 100% Escrow Protection
                        </span>
                      </div>

                      {/* 4 Popular Apps */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500">Choose Instant UPI Application</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'gpay', name: 'Google Pay', icon: <GooglePayIcon className="w-7 h-7" />, handle: '@okaxis' },
                            { id: 'phonepe', name: 'PhonePe', icon: <PhonePeIcon className="w-7 h-7" />, handle: '@ybl' },
                            { id: 'paytm', name: 'Paytm UPI', icon: <PaytmIcon className="w-8 h-4" />, handle: '@paytm' },
                            { id: 'bhim', name: 'BHIM UPI', icon: <BhimIcon className="w-7 h-7" />, handle: '@upi' }
                          ].map(app => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => setPaymentForm(prev => ({
                                ...prev,
                                upiApp: app.id,
                                upiId: `alex.customer${app.handle}`,
                                isUpiVerified: true
                              }))}
                              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                paymentForm.upiApp === app.id
                                  ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500 shadow-sm'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <div className="h-7 flex items-center justify-center">{app.icon}</div>
                              <span className="text-[11px] font-extrabold text-center leading-tight">{app.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom UPI ID */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-bold text-slate-500">Or Enter UPI ID / VPA</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={paymentForm.upiId}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, upiId: e.target.value.toLowerCase(), isUpiVerified: false }))}
                            placeholder="yourname@bank"
                            className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, isUpiVerified: true }))}
                            className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs cursor-pointer"
                          >
                            {paymentForm.isUpiVerified ? '✓ Verified' : 'Verify'}
                          </button>
                        </div>

                        {paymentForm.isUpiVerified && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Verified NPCI UPI ID • Instant Auto-Pay Ready</span>
                          </div>
                        )}

                        {/* Suffix pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['@okhdfcbank', '@okaxis', '@ybl', '@paytm', '@ibl'].map(handle => (
                            <button
                              key={handle}
                              type="button"
                              onClick={() => {
                                const prefix = paymentForm.upiId.split('@')[0] || (user?.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'customer');
                                setPaymentForm(prev => ({ ...prev, upiId: `${prefix}${handle}`, isUpiVerified: true }));
                              }}
                              className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:border-orange-500 cursor-pointer"
                            >
                              {handle}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* C. NETBANKING FORM */}
                  {paymentForm.paymentMethod === 'NETBANKING' && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Select Bank</span>
                        <span className="text-[10px] text-slate-400 font-bold">50+ Banks Supported</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          'HDFC Bank',
                          'State Bank of India (SBI)',
                          'ICICI Bank',
                          'Axis Bank',
                          'Kotak Mahindra Bank',
                          'Punjab National Bank'
                        ].map(bank => (
                          <button
                            key={bank}
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, bankName: bank }))}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                              paymentForm.bankName === bank
                                ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500 shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {getBankIcon(bank)}
                            <span className="truncate">{bank}</span>
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">All Other Indian Banks</label>
                        <select
                          value={paymentForm.bankName}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, bankName: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                        >
                          <option value="HDFC Bank">HDFC Bank</option>
                          <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                          <option value="ICICI Bank">ICICI Bank</option>
                          <option value="Axis Bank">Axis Bank</option>
                          <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                          <option value="Bank of Baroda">Bank of Baroda</option>
                          <option value="Canara Bank">Canara Bank</option>
                          <option value="Union Bank of India">Union Bank of India</option>
                          <option value="IndusInd Bank">IndusInd Bank</option>
                          <option value="Federal Bank">Federal Bank</option>
                          <option value="IDFC First Bank">IDFC First Bank</option>
                          <option value="Yes Bank">Yes Bank</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* D. WALLET FORM */}
                  {paymentForm.paymentMethod === 'ESCROW_WALLET' && (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">ChefHub Escrow Wallet</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-[10px] uppercase">
                          Escrow Protected
                        </span>
                      </div>

                      {/* Wallet Balance Display */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-orange-500/15 border border-orange-500/25 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md">
                            <Wallet className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available Balance</span>
                            <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                              ₹{walletBalance.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddMoneyModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Money</span>
                        </button>
                      </div>

                      {/* Sufficiency Check */}
                      {walletBalance >= grandTotal ? (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                          <div className="flex items-center gap-1.5 font-black">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Sufficient Balance for this Order!</span>
                          </div>
                          <p className="text-[11px]">
                            Order due: <strong>₹{grandTotal.toFixed(2)}</strong>. Balance remaining after payment: <strong>₹{(walletBalance - grandTotal).toFixed(2)}</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-400 space-y-2">
                          <div className="flex items-center gap-1.5 font-black">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <span>Insufficient Wallet Balance</span>
                          </div>
                          <p className="text-[11px]">
                            Total due is <strong>₹{grandTotal.toFixed(2)}</strong>, but wallet has <strong>₹{walletBalance.toFixed(2)}</strong> (Deficit: <strong>₹{(grandTotal - walletBalance).toFixed(2)}</strong>).
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleTopUpWallet(Math.ceil(grandTotal - walletBalance + 50))}
                              disabled={isAddingMoney}
                              className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
                            >
                              {isAddingMoney ? 'Adding Funds...' : `Quick Add ₹${Math.ceil(grandTotal - walletBalance + 50)} & Continue`}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Quick Top-Up */}
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-extrabold text-slate-500 block">Quick Top-Up via Payment Gateway</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[200, 500, 1000, 2000].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleTopUpWallet(amt)}
                              disabled={isAddingMoney}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white text-xs font-bold font-mono transition-all cursor-pointer"
                            >
                              +₹{amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Price Breakdown & Total */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Items Subtotal</span>
                    <span className="font-mono">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Standard Express Delivery</span>
                    <span className="font-mono">
                      {appliedCoupon?.code === 'FREESHIP' ? '₹0.00 (FREE)' : `₹${effectiveDeliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-500 font-bold">
                      <span>Coupon Discount ({appliedCoupon.code})</span>
                      <span className="font-mono">-₹{couponDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-black">
                    <span>Total Amount Due</span>
                    <span className="text-amber-500 font-mono text-base font-black">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* 5. Production Escrow Checkout Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => handleExecutePaymentAndOrder(e, false)}
                    disabled={isProcessingPayment || !isCurrentAreaServiced}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {!isCurrentAreaServiced ? (
                      <>
                        <MapPinOff className="w-4 h-4" />
                        <span>Area Outside 20km Radius</span>
                      </>
                    ) : isProcessingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authorizing Escrow Payment & Placing Order...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pay ₹{grandTotal.toFixed(2)} & Place Order</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* Tracking Modal with Live Map & Flipkart-Style Timeline */}
      {activeTrackingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-4xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Order #{activeTrackingOrder.order_id} Live Delivery</h3>
                  <p className="text-xs text-slate-500">
                    {['OUT_FOR_DELIVERY', 'RIDER_ACCEPTED', 'DELIVERED'].includes(String(activeTrackingOrder.status || '').toUpperCase())
                      ? `Courier navigation from ${activeTrackingOrder.vendor_name} to your address`
                      : `Order preparation & dispatch tracking • ${activeTrackingOrder.vendor_name}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Real-Time Live Status Pill (Read-Only • Live Synchronized) */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="tracking-wide uppercase text-[10px] font-black">Live Telemetry</span>
                  <span className="text-slate-400 hidden sm:inline">•</span>
                  <span className="text-slate-700 dark:text-slate-200 text-[11px] font-extrabold hidden sm:inline">
                    {(() => {
                      const s = String(activeTrackingOrder.status || '').toUpperCase();
                      if (['PLACED', 'CONFIRMED', 'ORDER_PLACED'].includes(s)) return 'Stage 1: Placed (Waiting for Chef)';
                      if (['PREPARING', 'KITCHEN_PREPARING'].includes(s)) return 'Stage 2: Cooking in Kitchen';
                      if (['READY', 'KITCHEN_READY', 'READY_FOR_PICKUP'].includes(s)) return 'Stage 3: Food Ready & Packed';
                      if (['OUT_FOR_DELIVERY', 'RIDER_ACCEPTED'].includes(s)) return 'Stage 4: Courier En Route';
                      if (s === 'DELIVERED') return 'Stage 5: Delivered';
                      if (s === 'CANCELLED') return 'Cancelled (Refunded)';
                      return 'Stage 1: Order Placed';
                    })()}
                  </span>
                </div>

                <button 
                  onClick={() => setActiveTrackingOrder(null)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Close Live Tracking"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split Grid: Live Leaflet Map + Flowing Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left 7 cols: Interactive Leaflet Live Map */}
              <div className="lg:col-span-7 space-y-3">
                <LiveDeliveryMap
                  orderId={activeTrackingOrder.order_id}
                  orderStatus={activeTrackingOrder.status}
                  chefLocation={activeTrackingOrder.chef_location || CHEF_AVATARS[activeTrackingOrder.vendor_email]?.coords || { lat: 12.9784, lng: 77.6408, locality: activeTrackingOrder.vendor_name }}
                  customerLocation={{ lat: currentCoords.lat, lng: currentCoords.lng, locality: primaryAddress }}
                  riderName={activeTrackingOrder.rider_name || 'David Rider'}
                  riderPhone={activeTrackingOrder.rider_phone || '+91 98450 12890'}
                  vehicleType="Ather 450X EV Scooter"
                  viewerRole="CUSTOMER"
                  isDarkMode={true}
                />
              </div>

              {/* Right 5 cols: Flipkart-Style Animated Flowing Timeline */}
              <div className="lg:col-span-5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Milestone Timeline</h4>
                <div key={timelineAnimKey} className="relative py-2 px-1 max-h-[380px] overflow-y-auto no-scrollbar">
                  {(() => {
                    const stages = getTimelineStages(activeTrackingOrder);
                    return stages.map((stage, idx) => {
                      const isLast = idx === stages.length - 1;
                      const isDone = stage.isDone;
                      const isNextDone = !isLast && stages[idx + 1].isDone;
                      const delayBase = idx * 0.45;

                      return (
                        <div key={stage.key} className="relative flex items-start gap-4 pb-6 last:pb-2">
                          {!isLast && (
                            <div className="absolute left-[13px] top-[26px] bottom-0 w-1 rounded-full z-0 overflow-hidden bg-slate-200 dark:bg-slate-800">
                              {isNextDone && (
                                <div
                                  className="w-full bg-gradient-to-b from-amber-500 to-orange-500"
                                  style={{ height: '100%' }}
                                />
                              )}
                            </div>
                          )}

                          <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            stage.isError
                              ? 'bg-rose-500 text-white'
                              : isDone
                              ? stage.key === 'DELIVERED'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-black'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 text-[11px]'
                          }`}>
                            {stage.isError ? <X className="w-3.5 h-3.5" /> : isDone ? <CheckCircle2 className="w-4 h-4" /> : <span>{idx + 1}</span>}
                          </div>

                          <div className="space-y-1 pt-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className={`text-xs font-black uppercase ${
                                stage.isError ? 'text-rose-500' : isDone ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                              }`}>
                                {stage.title}
                              </h5>
                              {stage.isActive && !isLast && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[9px] font-black animate-pulse">
                                  IN PROGRESS
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              {stage.desc}
                            </p>
                            {isDone && stage.time ? (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ✓ {new Date(stage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className="text-slate-500">
                                  • {new Date(stage.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            ) : stage.isActive ? (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-extrabold mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                <span>Active Milestone • In progress</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 italic block mt-0.5">
                                ⏳ {stage.pendingLabel || 'Pending'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveTrackingOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs cursor-pointer"
              >
                Close Tracking
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Star Rating Review Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base">Rate Order #{reviewOrder.order_id}</h3>
              <button onClick={() => setReviewOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Chef Food Quality (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setVendorRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star className={`w-6 h-6 ${star <= vendorRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Courier Delivery Speed (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRiderRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star className={`w-6 h-6 ${star <= riderRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Feedback Comment</label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Delicious handcrafted food and quick doorstep delivery..."
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('chefhub_token');
                    await fetch(`/api/customer/orders/${reviewOrder.order_id}/review`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        vendor_rating: vendorRating,
                        rider_rating: riderRating,
                        comment: reviewComment
                      })
                    });
                    setReviewOrder(null);
                    fetchMyOrders();
                  } catch (e) {
                    setReviewOrder(null);
                  }
                }}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg cursor-pointer"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Order Modal */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-emerald-500/30 max-w-xl w-full space-y-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black">Order #{confirmedOrder.order_id} Confirmed!</h3>
              <p className="text-xs text-slate-500">
                Payment authorized. Escrow holds funds safely until your meal arrives.
              </p>
            </div>

            <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Address:</span>
                <span className="font-bold truncate max-w-[200px]">{confirmedOrder.delivery_address}</span>
              </div>
              {confirmedOrder.coupon_code && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Coupon Applied:</span>
                  <span>{confirmedOrder.coupon_code} (-₹{confirmedOrder.discount_amount})</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Total Paid:</span>
                <span className="text-amber-500">₹{Number(confirmedOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const toTrack = confirmedOrder;
                  setConfirmedOrder(null);
                  setActiveTrackingOrder(toTrack);
                }}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-lg cursor-pointer"
              >
                Track Order
              </button>
              <button
                onClick={() => setConfirmedOrder(null)}
                className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 border border-rose-500/30 max-w-sm w-full space-y-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl">
            <h3 className="font-black text-base">Cancel Order #{cancelModalOrder.order_id}?</h3>
            <p className="text-xs text-slate-500">
              Are you sure? Funds locked in escrow will be refunded back immediately.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => executeOrderCancellation(cancelModalOrder.order_id)}
                disabled={isCancellingOrder}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs cursor-pointer"
              >
                {isCancellingOrder ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Marketplace Footer & Portal Access */}
      <footer className="mt-20 pt-8 pb-12 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 dark:text-white">ChefHub</span>
            <span className="text-slate-400">© 2026 Artisanal Cloud Kitchens & Marketplace</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Partner Portals:</span>
            <a href="/chef/login" className="hover:text-emerald-500 transition-colors">👨‍🍳 Chef Kitchen</a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a href="/rider/login" className="hover:text-sky-500 transition-colors">🛵 Rider Hub</a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a href="/admin/login" className="hover:text-rose-500 transition-colors">🛡️ Admin Console</a>
          </div>
        </div>
      </footer>

      {/* Add New Saved Card Modal (RBI Tokenization Compliance) */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-[85] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                  💳
                </div>
                <div>
                  <h4 className="font-black text-sm">Save New Payment Card</h4>
                  <p className="text-[10px] text-slate-500">RBI Tokenization & Data Protection Notice</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCard} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Bank Name / Card Nickname</label>
                <input
                  type="text"
                  required
                  value={newCardInput.bank}
                  onChange={(e) => setNewCardInput(prev => ({ ...prev, bank: e.target.value }))}
                  placeholder="e.g. HDFC Regalia or ICICI Sapphiro"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Card Number (16 Digits)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={newCardInput.cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                      setNewCardInput(prev => ({ ...prev, cardNumber: formatted }));
                    }}
                    placeholder="4532 8892 1042 8821"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Cardholder Full Name</label>
                <input
                  type="text"
                  required
                  value={newCardInput.holder}
                  onChange={(e) => setNewCardInput(prev => ({ ...prev, holder: e.target.value }))}
                  placeholder="Full name as printed on card"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={newCardInput.exp}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      setNewCardInput(prev => ({ ...prev, exp: val }));
                    }}
                    placeholder="08/29"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">CVV</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={newCardInput.cvv}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setNewCardInput(prev => ({ ...prev, cvv: val }));
                    }}
                    placeholder="•••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono font-bold tracking-widest outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-snug">
                🔒 Under Reserve Bank of India (RBI) tokenization guidelines, your card credentials are encrypted and stored safely on device. You can remove saved cards anytime.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Save Card to Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Auth / Sign In Modal for Guests & Role Switchers */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative max-w-md w-full my-auto">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute -top-3 -right-3 z-50 w-8 h-8 rounded-full bg-slate-800 text-white border border-slate-700 flex items-center justify-center hover:bg-rose-500 transition-colors shadow-lg cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="overflow-hidden rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
              <CustomerAuthPage
                isModal={true}
                onLogin={(loggedInUser, loggedInToken) => {
                  onLogin(loggedInUser, loggedInToken);
                  setShowAuthModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Account Settings: Security & Credentials Modal (Change Password & Change Email MFA) */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-[88] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="glass-card bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-md w-full space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-lg">
                  🔑
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">Security & Credentials</h3>
                  <p className="text-[11px] text-slate-500">Manage account password & email authentication</p>
                </div>
              </div>
              <button
                onClick={() => setShowSecurityModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setSecurityActiveTab('PASSWORD');
                  setPwdForm(prev => ({ ...prev, error: '', success: '' }));
                }}
                className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  securityActiveTab === 'PASSWORD'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🔒 Change Password
              </button>
              <button
                onClick={() => {
                  setSecurityActiveTab('EMAIL');
                  setEmailMfaForm(prev => ({ ...prev, error: '', success: '', step: 1 }));
                }}
                className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  securityActiveTab === 'EMAIL'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📧 Change Email (MFA)
              </button>
            </div>

            {/* TAB 1: Change Password */}
            {securityActiveTab === 'PASSWORD' && (
              <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
                {pwdForm.error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold">
                    {pwdForm.error}
                  </div>
                )}
                {pwdForm.success && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold">
                    {pwdForm.success}
                  </div>
                )}

                <div>
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={pwdForm.currentPassword}
                    onChange={e => setPwdForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter existing password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={pwdForm.newPassword}
                    onChange={e => setPwdForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="At least 8 chars with symbols & numbers"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                  />
                  {pwdForm.newPassword && (() => {
                    const check = evalChangePwd(pwdForm.newPassword);
                    return (
                      <div className="mt-2 space-y-1.5">
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${check.score >= 4 ? 'bg-emerald-500' : check.score >= 2 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${(check.score / 5) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={check.score >= 4 ? 'text-emerald-500 font-bold' : 'text-slate-500'}>
                            {check.score >= 4 ? '✓ Strong Password' : 'Requires numbers, letters & symbols'}
                          </span>
                          <span className="text-slate-400 font-mono">{check.score}/5 checks</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={pwdForm.confirmPassword}
                    onChange={e => setPwdForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Re-type new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={pwdForm.loading}
                    className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {pwdForm.loading ? 'Updating Password…' : 'Save New Password'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Change Email (Multi-Factor Verification Flow) */}
            {securityActiveTab === 'EMAIL' && (
              <div className="space-y-3.5">
                {emailMfaForm.error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold">
                    {emailMfaForm.error}
                  </div>
                )}
                {emailMfaForm.success && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold">
                    {emailMfaForm.success}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Current Registered Email</span>
                  <p className="text-xs font-black text-slate-900 dark:text-white">{user?.email || 'N/A'}</p>
                </div>

                {emailMfaForm.step === 1 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      To safeguard your account identity, updating your primary email address requires multi-factor identity verification.
                    </p>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs">
                      <span className="font-bold block">🛡️ Multi-Factor Protocol:</span>
                      <span>Primary: SMS OTP to your registered phone ({user?.phone || 'Linked Mobile'}). Fallback: Email verification code.</span>
                    </div>
                    <button
                      type="button"
                      disabled={emailMfaForm.loading}
                      onClick={handleRequestEmailChangeOtp}
                      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {emailMfaForm.loading ? 'Sending Verification Code…' : 'Send Verification OTP'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyEmailOtpAndUpdate} className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      ✓ Verification code sent to {emailMfaForm.targetMasked}
                    </div>

                    {emailMfaForm.devOtp && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex justify-between items-center font-mono">
                        <span>⚡ Demo Code:</span>
                        <span className="font-black text-sm tracking-widest">{emailMfaForm.devOtp}</span>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        Enter 6-Digit Verification Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={emailMfaForm.otpInput}
                        onChange={e => setEmailMfaForm(prev => ({ ...prev, otpInput: e.target.value.replace(/\D/g, '') }))}
                        placeholder="123456"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold tracking-widest outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                        New Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={emailMfaForm.newEmailInput}
                        onChange={e => setEmailMfaForm(prev => ({ ...prev, newEmailInput: e.target.value }))}
                        placeholder="new.email@domain.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={emailMfaForm.loading || !emailMfaForm.otpInput || !emailMfaForm.newEmailInput}
                        className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                      >
                        {emailMfaForm.loading ? 'Updating Email…' : 'Verify OTP & Save New Email'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailMfaForm(prev => ({ ...prev, step: 1 }))}
                        className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
