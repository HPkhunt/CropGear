import React, { useEffect, useRef, useState } from 'react';
import {
    CreditCard,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import { equipmentService } from '../services/equipmentService';
import { miscService } from '../services/miscService';
import { getErrorMessage, isRequestCanceled } from '../utils/helpers.js';
import HomeHeroSection from '../components/home/HomeHeroSection.jsx';
import HomeCategorySection from '../components/home/HomeCategorySection.jsx';
import HomeWorkflowSection from '../components/home/HomeWorkflowSection.jsx';
import HomeRoleSection from '../components/home/HomeRoleSection.jsx';
import HomeFeaturedSection from '../components/home/HomeFeaturedSection.jsx';
import HomeStorySection from '../components/home/HomeStorySection.jsx';
import HomeCtaSection from '../components/home/HomeCtaSection.jsx';

import heroBanner from '../assets/images/hero_banner_1772246252951.png';
import catTractor from '../assets/images/category_tractor_1772246270519.png';
import catHarvester from '../assets/images/category_harvester_1772246289195.png';
import catPlough from '../assets/images/category_plough_1772246305462.png';
import catSeeder from '../assets/images/category_seeder_1772246342425.png';
import spotlightEquip from '../assets/images/spotlight_equip_1772246498548.png';
import whyVerified from '../assets/images/why_verified_1772246374122.png';
import whySecure from '../assets/images/why_secure_1772246404100.png';
import whyBooking from '../assets/images/why_booking_1772246422051.png';
import communityImg from '../assets/images/community_1772246483497.png';
import ctaBg from '../assets/images/cta_bg_1772246513626.png';

const categoriesData = [
    {
        label: 'Tractors',
        value: 'tractor',
        image: catTractor,
        copy: 'Power-heavy field prep, towing, and all-day acreage work.'
    },
    {
        label: 'Harvesters',
        value: 'harvester',
        image: catHarvester,
        copy: 'Peak-season harvesting support with fast-response owners.'
    },
    {
        label: 'Tillage Gear',
        value: 'tillage',
        image: catPlough,
        copy: 'Prep soil faster with ploughs and tillage-ready implements.'
    },
    {
        label: 'Seeders',
        value: 'seeder',
        image: catSeeder,
        copy: 'Precision seeding tools for cleaner planting windows.'
    }
];

const trustItems = [
    {
        title: 'Identity Verified',
        copy: 'Owners move through approval-aware flows before listings become marketplace-ready.',
        icon: ShieldCheck,
        image: whyVerified,
        tags: ['Verified owner badges', 'Approval workflow', 'Trust signals']
    },
    {
        title: 'Secure Payments',
        copy: 'Payment readiness and status stay visible before a booking moves forward.',
        icon: CreditCard,
        image: whySecure,
        tags: ['Payment gating', 'Receipt history', 'Clear status']
    },
    {
        title: 'Fast Booking Flow',
        copy: 'Nearby filters, saved searches, and compare shortlists shorten the path to action.',
        icon: Zap,
        image: whyBooking,
        tags: ['Nearby search', 'Saved presets', 'Compare shortlist']
    }
];

const EMPTY_STATS = { equipments: null, owners: null, bookings: null };
const SUGGESTION_DEBOUNCE_MS = 350;
const SUGGESTION_MIN_QUERY_LENGTH = 2;

const normalizeStats = (payload) => ({
    equipments: payload && typeof payload.equipments === 'number' ? payload.equipments : null,
    owners: payload && typeof payload.owners === 'number' ? payload.owners : null,
    bookings: payload && typeof payload.bookings === 'number' ? payload.bookings : null,
    is_demo: payload?.is_demo || false
});

function formatStat(value) {
    return value === null || value === undefined ? '--' : Number(value).toLocaleString();
}

export default function Home() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [stats, setStats] = useState(EMPTY_STATS);
    const [animatedStats, setAnimatedStats] = useState({ equipments: 0, owners: 0, bookings: 0 });
    const [featuredEquipment, setFeaturedEquipment] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [testimonials, setTestimonials] = useState([
        {
            quote: 'CropGear completely changed how we handle peak planting season. We found a seeder in under half an hour.',
            author: 'John P., Iowa Farms'
        },
        {
            quote: 'Renting out our idle tractor covered maintenance costs and kept our fleet active all year.',
            author: 'Sarah M., Midwest Ag'
        }
    ]);
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    const suggestionTimeoutRef = useRef(null);
    const suggestionAbortRef = useRef(null);

    const browsePath = user?.role === 'farmer' ? '/farmer/equipments' : '/browse-equipment';
    const dashboardPath = user?.role === 'admin'
        ? '/admin/dashboard'
        : user?.role === 'equipment_owner'
            ? '/owner/dashboard'
            : '/farmer/dashboard';

    const rolePanels = [
        {
            title: 'Find machines fast',
            copy: 'Browse verified listings, shortlist favorites, and compare options before you book.',
            image: heroBanner,
            to: browsePath,
            cta: 'Explore marketplace'
        },
        {
            title: 'Turn idle equipment into revenue',
            copy: 'Owners can launch new listings, manage requests, and track reputation from one workspace.',
            image: spotlightEquip,
            to: isAuthenticated && user?.role === 'equipment_owner' ? '/owner/add-equipment' : '/auth/register',
            cta: isAuthenticated && user?.role === 'equipment_owner' ? 'Add listing' : 'Start listing'
        },
        {
            title: 'Stay aligned on delivery',
            copy: 'Docs and workspace links keep the product easier to understand across roles.',
            image: communityImg,
            to: isAuthenticated ? dashboardPath : '/docs',
            cta: isAuthenticated ? 'Open workspace' : 'Open docs'
        }
    ];

    const clearPendingSuggestionRequest = () => {
        if (suggestionTimeoutRef.current) {
            window.clearTimeout(suggestionTimeoutRef.current);
            suggestionTimeoutRef.current = null;
        }
        if (suggestionAbortRef.current) {
            suggestionAbortRef.current.abort();
            suggestionAbortRef.current = null;
        }
    };

    const hideSuggestions = () => {
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const buildDetailsPath = (id) => (user?.role === 'farmer' ? `/farmer/equipment/${id}` : `/equipment/${id}`);

    const handleCategoryClick = (categoryValue) => {
        navigate(`${browsePath}?category=${encodeURIComponent(categoryValue)}`);
    };

    const handleSearchChange = (event) => {
        const nextValue = event.target.value;
        setSearchQuery(nextValue);
        if (!nextValue.trim()) {
            clearPendingSuggestionRequest();
            hideSuggestions();
        }
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        clearPendingSuggestionRequest();
        hideSuggestions();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            navigate(`${browsePath}?q=${encodeURIComponent(trimmedQuery)}`);
        }
    };

    const handleSuggestionClick = (id) => {
        clearPendingSuggestionRequest();
        hideSuggestions();
        navigate(buildDetailsPath(id));
    };

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery.length < SUGGESTION_MIN_QUERY_LENGTH) {
            clearPendingSuggestionRequest();
            hideSuggestions();
            return undefined;
        }

        clearPendingSuggestionRequest();
        const controller = new AbortController();
        suggestionAbortRef.current = controller;

        suggestionTimeoutRef.current = window.setTimeout(async () => {
            suggestionTimeoutRef.current = null;
            try {
                const { items } = await equipmentService.browse(
                    { q: trimmedQuery, page_size: 5 },
                    { signal: controller.signal }
                );
                if (controller.signal.aborted) return;
                setSuggestions(items);
                setShowSuggestions(items.length > 0);
            } catch (error) {
                if (isRequestCanceled(error)) return;
                hideSuggestions();
                console.error('suggestion fetch failed', getErrorMessage(error, 'Unable to load suggestions.'));
            } finally {
                if (suggestionAbortRef.current === controller) {
                    suggestionAbortRef.current = null;
                }
            }
        }, SUGGESTION_DEBOUNCE_MS);

        return () => {
            if (suggestionTimeoutRef.current) {
                window.clearTimeout(suggestionTimeoutRef.current);
                suggestionTimeoutRef.current = null;
            }
            controller.abort();
            if (suggestionAbortRef.current === controller) {
                suggestionAbortRef.current = null;
            }
        };
    }, [searchQuery]);

    useEffect(() => {
        const loadHomePageData = async () => {
            try {
                try {
                    const data = await miscService.getStats();
                    setStats(normalizeStats(data));
                } catch (error) {
                    console.warn('Stats fetch failed; leaving stats empty', error);
                    setStats(EMPTY_STATS);
                }

                const { items } = await equipmentService.browse({ page_size: 4, sort: 'rating' });
                if (items && items.length) {
                    setFeaturedEquipment(items);
                } else {
                    setFeaturedEquipment([
                        { id: 1, name: 'Eco-Harvester Pro', daily_rate: 350, location: 'Des Moines, IA', rating: 4.9 },
                        { id: 2, name: 'Precision Seeder', daily_rate: 200, location: 'Ames, IA', rating: 4.7 },
                        { id: 3, name: 'Deere Tractor 5000', daily_rate: 500, location: 'Iowa City, IA', rating: 4.8 },
                        { id: 4, name: 'Rotary Plough', daily_rate: 150, location: 'Cedar Rapids, IA', rating: 4.5 }
                    ]);
                }

                try {
                    const nextTestimonials = await miscService.getTestimonials();
                    if (Array.isArray(nextTestimonials) && nextTestimonials.length) {
                        setTestimonials(nextTestimonials);
                    }
                } catch (error) {
                    console.warn('Testimonials fetch failed, using defaults', error);
                }
            } catch (error) {
                console.error('Home data load error', error);
            }
        };

        loadHomePageData();
    }, []);

    useEffect(() => {
        const duration = 2000;
        const steps = 60;
        const timers = [];
        const animateValue = (key, end) => {
            let current = 0;
            const increment = end / steps;
            const timer = window.setInterval(() => {
                current += increment;
                if (current >= end) {
                    setAnimatedStats((prev) => ({ ...prev, [key]: end }));
                    window.clearInterval(timer);
                } else {
                    setAnimatedStats((prev) => ({ ...prev, [key]: Math.floor(current) }));
                }
            }, duration / steps);
            timers.push(timer);
        };

        if (stats.equipments > 0) animateValue('equipments', stats.equipments);
        if (stats.owners > 0) animateValue('owners', stats.owners);
        if (stats.bookings > 0) animateValue('bookings', stats.bookings);

        return () => {
            timers.forEach((timer) => window.clearInterval(timer));
        };
    }, [stats]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setCurrentTestimonial((value) => (value + 1) % testimonials.length);
        }, 6000);
        return () => window.clearInterval(timer);
    }, [testimonials.length]);

    const activeTestimonial = testimonials[currentTestimonial] || testimonials[0];
    const liveListingsValue = formatStat(stats.equipments !== null ? animatedStats.equipments : stats.equipments);
    const verifiedOwnersValue = formatStat(stats.owners !== null ? animatedStats.owners : stats.owners);
    const bookingVolumeValue = formatStat(stats.bookings !== null ? animatedStats.bookings : stats.bookings);
    const heroStats = [
        { label: 'Live listings', value: liveListingsValue, copy: 'Equipment ready to browse right now.' },
        { label: 'Verified owners', value: verifiedOwnersValue, copy: 'Approval-aware owners visible before booking.' },
        { label: 'Bookings tracked', value: bookingVolumeValue, copy: 'Seasonal demand already moving through CropGear.' }
    ];

    return (
        <div className="container mx-auto space-y-10 py-6 sm:py-8">
            <HomeHeroSection
                heroStats={heroStats}
                browsePath={browsePath}
                dashboardPath={dashboardPath}
                isAuthenticated={isAuthenticated}
                liveListingsValue={liveListingsValue}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onSearchSubmit={handleSearchSubmit}
                showSuggestions={showSuggestions}
                suggestions={suggestions}
                onSuggestionClick={handleSuggestionClick}
                isDemo={stats.is_demo}
                heroImage={heroBanner}
            />

            <HomeCategorySection browsePath={browsePath} categories={categoriesData} onCategoryClick={handleCategoryClick} />
            <HomeWorkflowSection trustItems={trustItems} />
            <HomeRoleSection rolePanels={rolePanels} />
            <HomeFeaturedSection featuredEquipment={featuredEquipment} />
            <HomeStorySection
                activeTestimonial={activeTestimonial}
                onPrevious={() => setCurrentTestimonial((value) => (value - 1 + testimonials.length) % testimonials.length)}
                onNext={() => setCurrentTestimonial((value) => (value + 1) % testimonials.length)}
                communityImage={communityImg}
            />
            <HomeCtaSection
                browsePath={browsePath}
                dashboardPath={dashboardPath}
                isAuthenticated={isAuthenticated}
                ctaImage={ctaBg}
            />
        </div>
    );
}
