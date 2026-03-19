import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { equipmentService } from '../services/equipmentService';
import { miscService } from '../services/miscService';
import { getEquipmentImage } from '../utils/equipmentImages.js';
import { getErrorMessage, isRequestCanceled } from '../utils/helpers.js';
import './Home.css';

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
    { label: 'Tractors', image: catTractor },
    { label: 'Harvesters', image: catHarvester },
    { label: 'Ploughs', image: catPlough },
    { label: 'Seeders', image: catSeeder },
];

const whyItems = [
    { title: 'Identity Verified', copy: 'Every owner on our platform goes through a rigorous vetting process to ensure equipment safety.', icon: '🛡️', image: whyVerified },
    { title: 'Secure Escrow Payments', copy: 'Your funds are held safely and only released when you confirm satisfaction.', icon: '💳', image: whySecure },
    { title: 'Lightning Fast Booking', copy: 'Our smart matching algorithm connects you to local machinery in minutes.', icon: '⚡', image: whyBooking },
];

const EMPTY_STATS = { equipments: null, owners: null, bookings: null };
const SUGGESTION_DEBOUNCE_MS = 350;
const SUGGESTION_MIN_QUERY_LENGTH = 2;

const normalizeStats = (payload) => ({
    equipments: (payload && typeof payload.equipments === 'number') ? payload.equipments : null,
    owners: (payload && typeof payload.owners === 'number') ? payload.owners : null,
    bookings: (payload && typeof payload.bookings === 'number') ? payload.bookings : null,
    is_demo: payload?.is_demo || false,
});

const Home = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(EMPTY_STATS);
    const [animatedStats, setAnimatedStats] = useState({ equipments: 0, owners: 0, bookings: 0 });
    const [featuredEquipment, setFeaturedEquipment] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [testimonials, setTestimonials] = useState([
        { quote: 'CropGear completely revolutionized how we handle peak planting season. Found a seeder in 20 minutes.', author: 'John P., Iowa Farms' },
        { quote: 'Renting out my idle tractor paid for its maintenance for the whole year.', author: 'Sarah M., Midwest Ag' }
    ]);
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    const suggestionTimeoutRef = useRef(null);
    const suggestionAbortRef = useRef(null);

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

    const handleCategoryClick = (label) => {
        navigate(`/farmer/equipments?category=${encodeURIComponent(label)}`);
    };

    const handleSearchChange = (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (!q.trim()) {
            clearPendingSuggestionRequest();
            hideSuggestions();
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        clearPendingSuggestionRequest();
        hideSuggestions();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            navigate(`/farmer/equipments?q=${encodeURIComponent(trimmedQuery)}`);
        }
    };

    const handleSuggestionClick = (id) => {
        clearPendingSuggestionRequest();
        hideSuggestions();
        navigate(`/equipment/${id}`);
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

                if (controller.signal.aborted) {
                    return;
                }

                setSuggestions(items);
                setShowSuggestions(items.length > 0);
            } catch (err) {
                if (isRequestCanceled(err)) {
                    return;
                }

                hideSuggestions();
                console.error('suggestion fetch failed', getErrorMessage(err, 'Unable to load suggestions.'));
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
                // Fetch stats
                try {
                    const data = await miscService.getStats();
                    setStats(normalizeStats(data));
                } catch (err) {
                    console.warn('Stats fetch failed; leaving stats empty', err);
                    setStats(EMPTY_STATS);
                }

                // Fetch featured
                const { items } = await equipmentService.browse({ page_size: 4, sort: 'rating' });
                if (items && items.length) {
                    setFeaturedEquipment(items);
                } else {
                    setFeaturedEquipment([
                        { id: 1, name: 'Eco-Harvester Pro', daily_rate: 350, image_url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&q=80', location: 'Des Moines, IA', rating: 4.9 },
                        { id: 2, name: 'Precision Seeder', daily_rate: 200, image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80', location: 'Ames, IA', rating: 4.7 },
                        { id: 3, name: 'Deere Tractor 5000', daily_rate: 500, image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80', location: 'Iowa City, IA', rating: 4.8 },
                        { id: 4, name: 'Rotary Plough', daily_rate: 150, image_url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&q=80', location: 'Cedar Rapids, IA', rating: 4.5 }
                    ]);
                }

                // Fetch testimonials
                try {
                    const arr = await miscService.getTestimonials();
                    if (Array.isArray(arr) && arr.length) {
                        setTestimonials(arr);
                    }
                } catch (err) {
                    console.warn('Testimonials fetch failed, using defaults', err);
                }
            } catch (error) {
                console.error('Home data load error', error);
            }
        };

        loadHomePageData();
    }, []);

    // Animate stats
    useEffect(() => {
        const duration = 2000;
        const steps = 60;
        const animateValue = (key, end) => {
            let current = 0;
            const increment = end / steps;
            const timer = setInterval(() => {
                current += increment;
                if (current >= end) {
                    setAnimatedStats(prev => ({ ...prev, [key]: end }));
                    clearInterval(timer);
                } else {
                    setAnimatedStats(prev => ({ ...prev, [key]: Math.floor(current) }));
                }
            }, duration / steps);
        };

        if (stats.equipments > 0) animateValue('equipments', stats.equipments);
        if (stats.owners > 0) animateValue('owners', stats.owners);
        if (stats.bookings > 0) animateValue('bookings', stats.bookings);
    }, [stats]);

    // Testimonial auto rotation
    useEffect(() => {
        const idx = setInterval(() => {
            setCurrentTestimonial(c => (c + 1) % testimonials.length);
        }, 6000);
        return () => clearInterval(idx);
    }, [testimonials.length]);

    const formatStat = (value) => (value === null || value === undefined ? '—' : Number(value).toLocaleString());

    return (
        <div className="home-premium">
            {/* HER0 */}
            <section className="hero-premium">
                <div className="hero-background">
                    <img src={heroBanner} alt="Agriculture field" />
                </div>

                <div className="hero-grid">
                    <div className="hero-content">
                        <div className="hero-badge premium-fade-in delay-1">
                            ✨ Redefining AgTech
                        </div>
                        <h1 className="premium-fade-in delay-2">
                            The smartest way to <span className="gradient-text">exchange equipment.</span>
                        </h1>
                        <p className="premium-fade-in delay-3">
                            Rent top-tier agricultural machinery on demand, or start earning by listing your idle equipment securely.
                        </p>
                        <div className="hero-actions premium-fade-in delay-4">
                            <Link to="/browse-equipment" className="btn-glow">Explore Machinery</Link>
                            {(!localStorage.getItem('token')) && (
                                <Link to="/auth/register" className="btn-glass">Become a Lender</Link>
                            )}
                        </div>

                        <form className="hero-search-glass premium-fade-in delay-4" onSubmit={handleSearchSubmit}>
                            <input
                                type="text"
                                placeholder="Search 'Harvesters'..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                            />
                            <button type="submit">Search</button>

                            {showSuggestions && suggestions.length > 0 && (
                                <ul className="search-suggestions-glass">
                                    {suggestions.map(item => (
                                        <li key={item.id} onClick={() => handleSuggestionClick(item.id)}>
                                            {item.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </form>
                    </div>

                    <div className="hero-visuals premium-fade-in delay-3">
                        <div className="glass-card-floating">
                            <img src={spotlightEquip} alt="Featured Tractor" />
                            <div className="glass-card-info">
                                <div>
                                    <h3>Advanced Tractor 5000</h3>
                                    <p>Available in Iowa City</p>
                                </div>
                                <div className="glass-card-price">
                                    $500<span>/day</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* STATS */}
            <section className="stats-premium premium-fade-in delay-4" style={{ position: 'relative' }}>
                {stats.is_demo && (
                    <div className="demo-indicator-pill">
                        Demo Mode: Previewing Mock Statistics
                    </div>
                )}
                <div className="stat-glass">
                    <div className="icon">🚜</div>
                    <div className="number">{formatStat(stats.equipments !== null ? animatedStats.equipments : stats.equipments)}</div>
                    <div className="label">Available Machines</div>
                </div>
                <div className="stat-glass">
                    <div className="icon">🤝</div>
                    <div className="number">{formatStat(stats.owners !== null ? animatedStats.owners : stats.owners)}</div>
                    <div className="label">Verified Lenders</div>
                </div>
                <div className="stat-glass">
                    <div className="icon">📈</div>
                    <div className="number">{formatStat(stats.bookings !== null ? animatedStats.bookings : stats.bookings)}</div>
                    <div className="label">Successful Bookings</div>
                </div>
            </section>

            {/* CATEGORIES */}
            <section className="section-premium">
                <div className="section-header-premium">
                    <h2>Browse Categories</h2>
                    <p>Find exactly what you need from our extensive catalog of professional gear.</p>
                </div>

                <div className="categories-premium">
                    {categoriesData.map((cat, i) => (
                        <div key={i} className="category-glass" onClick={() => handleCategoryClick(cat.label)}>
                            <img src={cat.image} alt={cat.label} />
                            <div className="category-info">
                                <h3>{cat.label}</h3>
                                <span>Explore →</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FEATURED */}
            <section className="section-premium">
                <div className="section-header-premium">
                    <h2>Premium Equipment</h2>
                    <p>Highest rated machinery trusted by our community.</p>
                </div>

                <div className="equipment-grid-premium">
                    {featuredEquipment.map((item) => (
                        <div key={item.id} className="equipment-glass-card">
                            <div className="equipment-image-container">
                                <img src={item.image_url?.includes('picsum') ? getEquipmentImage(item) : (item.image_url || getEquipmentImage(item))} alt={item.name} />
                                <div className="equipment-rating">
                                    <span className="star">★</span> {Number(item.rating || 4.8).toFixed(1)}
                                </div>
                            </div>
                            <div className="equipment-details">
                                <h3>{item.name}</h3>
                                <div className="equipment-location">📍 {item.location || 'Nationwide'}</div>
                                <div className="equipment-footer">
                                    <div className="equipment-price">
                                        ${item.daily_rate}<span>/day</span>
                                    </div>
                                    <Link to={`/equipment/${item.id}`} className="btn-icon">
                                        →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* WHY US */}
            <section className="section-premium">
                <div className="section-header-premium">
                    <h2>The CropGear Advantage</h2>
                    <p>Why thousands of professionals trust us for their equipment needs.</p>
                </div>

                <div className="features-premium">
                    {whyItems.map((item, i) => (
                        <div key={i} className="feature-glass">
                            <img src={item.image} alt={item.title} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '16px', marginBottom: '1rem' }} />
                            <span className="feature-icon">{item.icon}</span>
                            <h3>{item.title}</h3>
                            <p>{item.copy}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="section-premium">
                <div className="testimonial-carousel">
                    {testimonials.map((t, idx) => (
                        <div key={idx} className={`testimonial-slide ${idx === currentTestimonial ? 'active' : ''}`}>
                            <div className="testimonial-quote">{t.quote}</div>
                            <div className="testimonial-author">— {t.author}</div>
                        </div>
                    ))}

                    <div className="testimonial-controls">
                        <button onClick={() => setCurrentTestimonial(c => (c - 1 + testimonials.length) % testimonials.length)}>←</button>
                        <button onClick={() => setCurrentTestimonial(c => (c + 1) % testimonials.length)}>→</button>
                    </div>
                </div>
            </section>

            {/* COMMUNITY */}
            <section className="section-premium" style={{ paddingTop: '0' }}>
                <div className="community-section">
                    <img src={communityImg} alt="Community in Action" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                    <div className="community-content-box">
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 800 }}>Community in Action</h2>
                        <p style={{ fontSize: '1.1rem', color: 'var(--app-text-muted)', maxWidth: '600px', margin: '0 auto' }}>Join thousands of verified farmers working together to make modern agriculture productive and accessible for everyone.</p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section-premium" style={{ paddingTop: '0' }}>
                <div className="cta-premium" style={{ background: `linear-gradient(rgba(16, 185, 129, 0.9), rgba(6, 78, 59, 0.95)), url(${ctaBg}) center/cover no-repeat` }}>
                    <div className="cta-premium-inner">
                        <h2>Ready to elevate your farming?</h2>
                        <p>Join the future of agricultural machinery sharing. Fast, secure, and professional.</p>
                        <Link to="/browse-equipment" className="btn-glass" style={{ background: '#fff', color: 'var(--app-secondary)' }}>
                            Get Started Now
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
