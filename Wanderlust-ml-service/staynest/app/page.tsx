"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { 
  MapPin, Calendar, User, ArrowRight, ArrowLeft, 
  Instagram, Twitter, Paperclip, Star 
} from "lucide-react";
import ChatWidget from "@/components/ChatWidget"; 

// --- Types ---
interface Listing {
  _id: string;
  title: string;
  image: string;
  location: string;
  price: number;
  rating: number;
}

// --- Mock Data ---
const collectionsData = [
  { title: "Architectural Gems", count: "12 Properties", image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
  { title: "Private Islands", count: "5 Properties", image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
  { title: "Urban Lofts", count: "28 Properties", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
  { title: "Forest Retreats", count: "15 Properties", image: "https://images.unsplash.com/photo-1449156493391-d2cfa28e468b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" },
  { title: "Historic Castles", count: "8 Properties", image: "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" }
];

export default function Home() {
  const [recommended, setRecommended] = useState<Listing[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- 1. Fetch AI Recommendations ---
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const user_id = "user_123"; 
        const history_ids = ["1001", "1002"]; 

        const res = await axios.post("http://localhost:5000/api/recommend-for-user", {
           user_id,
           history_ids
        });
        setRecommended(res.data.recommendations);
      } catch (err) {
        // Fallback Mock Data
        setRecommended([
           { _id: "99", title: "The Cliffside Onyx", location: "Santorini, Greece", price: 450, rating: 4.9, image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80" },
           { _id: "98", title: "Aspen Glass Cabin", location: "Aspen, USA", price: 800, rating: 5.0, image: "https://images.unsplash.com/photo-1449156493391-d2cfa28e468b?auto=format&fit=crop&w=800&q=80" },
           { _id: "97", title: "Kyoto Tea House", location: "Kyoto, Japan", price: 220, rating: 4.8, image: "https://images.unsplash.com/photo-1493936734716-77ba6da663bf?auto=format&fit=crop&w=800&q=80" },
        ]);
      }
    };
    fetchRecommendations();
  }, []);

  // --- Scroll Logic ---
  const scroll = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <main className="bg-white overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 py-6 px-6 lg:px-12 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
            <span className="font-serif text-3xl font-bold tracking-wider">StayNest<span className="text-goldAccent">.</span></span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
            {['Destinations', 'Curated Stays', 'Experiences', 'Magazine'].map((item) => (
                <a key={item} href="#" className="hover:text-goldAccent transition-colors">{item}</a>
            ))}
        </div>
        <div className="flex items-center gap-6">
            <button className="hidden md:block text-sm font-medium hover:text-goldAccent">Sign In</button>
            <button className="bg-goldAccent text-deepNavy px-6 py-2 uppercase text-xs font-bold tracking-widest hover:bg-white transition-colors">
                Book Now
            </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-[85vh] min-h-[600px] w-full bg-hero-pattern bg-cover bg-center bg-fixed">
        <div className="absolute inset-0 bg-gradient-to-b from-deepNavy/30 to-deepNavy/80"></div>
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4">
            <span className="text-goldAccent font-serif italic text-xl mb-4 animate-fade-in-up">The world awaits</span>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white font-medium mb-8 leading-tight max-w-4xl shadow-sm">
                Curating the <br/> Unforgettable
            </h1>
            <p className="text-gray-200 text-lg md:text-xl max-w-2xl font-light mb-12">
                Discover a collection of the world&apos;s most extraordinary homes, villas, and boutique hotels.
            </p>
        </div>

        {/* Floating Search Widget */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-[90%] max-w-5xl bg-white shadow-2xl p-6 md:p-8 z-20">
            <form className="flex flex-col md:flex-row gap-4 md:items-end">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-mutedGrey uppercase tracking-widest mb-2">Location</label>
                    <div className="relative border-b border-gray-200 pb-2">
                        <MapPin className="text-goldAccent absolute left-0 top-1 w-4 h-4" />
                        <input type="text" placeholder="Where are you going?" className="w-full pl-8 focus:outline-none text-deepNavy font-serif text-lg placeholder-gray-300" />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-mutedGrey uppercase tracking-widest mb-2">Dates</label>
                    <div className="relative border-b border-gray-200 pb-2">
                        <Calendar className="text-goldAccent absolute left-0 top-1 w-4 h-4" />
                        <input type="text" placeholder="Check-in — Check-out" className="w-full pl-8 focus:outline-none text-deepNavy font-serif text-lg placeholder-gray-300" />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-mutedGrey uppercase tracking-widest mb-2">Travelers</label>
                    <div className="relative border-b border-gray-200 pb-2">
                        <User className="text-goldAccent absolute left-0 top-1 w-4 h-4" />
                        <input type="text" placeholder="2 Adults, 0 Children" className="w-full pl-8 focus:outline-none text-deepNavy font-serif text-lg placeholder-gray-300" />
                    </div>
                </div>
                <button type="button" className="bg-deepNavy text-white px-8 py-4 uppercase text-xs font-bold tracking-widest hover:bg-goldAccent hover:text-deepNavy transition-colors mt-4 md:mt-0">
                    Search
                </button>
            </form>
        </div>
      </header>

      {/* Editorial / Philosophy Section */}
      <section className="pt-32 pb-20 bg-creamWhite">
        <div className="container mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2">
                <div className="relative">
                    <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-goldAccent"></div>
                    <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Interior" className="w-full h-auto object-cover shadow-xl relative z-10" />
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-goldAccent z-0"></div>
                </div>
            </div>
            <div className="md:w-1/2">
                <span className="text-goldAccent font-bold tracking-widest text-xs uppercase mb-2 block">Our Philosophy</span>
                <h2 className="font-serif text-4xl md:text-5xl text-deepNavy mb-6">Beyond the Ordinary</h2>
                <p className="text-mutedGrey text-lg leading-relaxed mb-6">
                    We believe travel is an art form. It&apos;s not just about a bed to sleep in, but the story you live while you&apos;re there. From secluded cliffside villas in Amalfi to modern glass cabins in Iceland, every property is hand-picked for its character.
                </p>
                <a href="#" className="inline-flex items-center gap-3 text-deepNavy font-bold uppercase text-xs tracking-widest border-b border-deepNavy pb-1 hover:text-goldAccent hover:border-goldAccent transition-all">
                    Read Our Story <ArrowRight className="w-4 h-4" />
                </a>
            </div>
        </div>
      </section>

      {/* --- AI RECOMMENDATIONS --- */}
      {recommended.length > 0 && (
        <section className="py-20 bg-deepNavy text-white">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <span className="text-goldAccent font-bold tracking-widest text-xs uppercase">Curated For You</span>
                        <h2 className="font-serif text-4xl mt-2">Your Personal Selection</h2>
                    </div>
                    <div className="hidden md:block text-sm text-gray-400">
                        Based on your recent views
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {recommended.map((item) => (
                        <div key={item._id} className="group cursor-pointer">
                             <div className="relative h-[300px] overflow-hidden mb-4">
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-white flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-goldAccent text-goldAccent" /> {item.rating}
                                </div>
                             </div>
                             <div>
                                <span className="text-goldAccent text-xs font-bold uppercase tracking-widest">{item.location}</span>
                                <h3 className="font-serif text-2xl mt-1 mb-2 group-hover:text-goldAccent transition-colors">{item.title}</h3>
                                <p className="text-gray-400 text-sm">Starting from <span className="text-white font-semibold">${item.price}</span> / night</p>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      )}

      {/* Curated Collections (Horizontal Scroll) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 lg:px-12 mb-10 flex justify-between items-end">
            <div>
                <span className="text-goldAccent font-bold tracking-widest text-xs uppercase">Curated Collections</span>
                <h2 className="font-serif text-4xl text-deepNavy mt-2">Find Your Vibe</h2>
            </div>
            
            <div className="hidden md:flex gap-3">
                <button 
                    onClick={() => scroll(-350)} 
                    className="w-12 h-12 border border-deepNavy text-deepNavy flex items-center justify-center hover:bg-deepNavy hover:text-goldAccent transition-all duration-300 active:scale-95"
                    aria-label="Scroll Left"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => scroll(350)} 
                    className="w-12 h-12 border border-deepNavy text-deepNavy flex items-center justify-center hover:bg-deepNavy hover:text-goldAccent transition-all duration-300 active:scale-95"
                    aria-label="Scroll Right"
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-6 px-6 lg:px-12 pb-8 no-scrollbar scroll-smooth"
        >
            {collectionsData.map((item, index) => (
                <div key={index} className="min-w-[280px] md:min-w-[350px] group cursor-pointer">
                    <div className="h-[400px] overflow-hidden relative mb-4">
                        <div className="absolute inset-0 bg-deepNavy/20 group-hover:bg-transparent transition-colors z-10"></div>
                        <img src={item.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title} />
                    </div>
                    <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                        <div>
                            <h3 className="font-serif text-2xl text-deepNavy group-hover:text-goldAccent transition-colors">{item.title}</h3>
                            <p className="text-mutedGrey text-sm mt-1">{item.count}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-mutedGrey group-hover:bg-deepNavy group-hover:text-goldAccent group-hover:border-deepNavy transition-all">
                            <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Featured Destination (Masonry Style) */}
      <section className="py-20 bg-deepNavy text-white">
        <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center mb-16">
                <span className="text-goldAccent font-bold tracking-widest text-xs uppercase">Trending Now</span>
                <h2 className="font-serif text-4xl md:text-5xl mt-3">The Gold Standard</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                {/* Large Item */}
                <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden cursor-pointer">
                    <img src="https://images.unsplash.com/photo-1512918760383-eda27c3b7c95?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" alt="Morocco" />
                    <div className="absolute bottom-0 left-0 p-8 bg-gradient-to-t from-deepNavy to-transparent w-full">
                        <span className="text-goldAccent text-xs font-bold uppercase tracking-widest mb-1 block">Morocco</span>
                        <h3 className="font-serif text-3xl">The Royal Mansour</h3>
                        <p className="text-gray-300 text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">Experience the timeless elegance of Marrakech in a private riad.</p>
                    </div>
                </div>

                {/* Tall Item */}
                <div className="md:row-span-2 relative group overflow-hidden cursor-pointer">
                    <img src="https://images.unsplash.com/photo-1507643179173-617aa8769db4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" alt="Santorini" />
                    <div className="absolute bottom-0 left-0 p-8 bg-gradient-to-t from-deepNavy to-transparent w-full">
                         <span className="text-goldAccent text-xs font-bold uppercase tracking-widest mb-1 block">Greece</span>
                        <h3 className="font-serif text-2xl">Cliffside Oia</h3>
                    </div>
                </div>

                {/* Small Item */}
                <div className="relative group overflow-hidden cursor-pointer">
                    <img src="https://images.unsplash.com/photo-1534088568595-a066f410bcda?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" alt="Alps" />
                    <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-deepNavy to-transparent w-full">
                         <span className="text-goldAccent text-xs font-bold uppercase tracking-widest mb-1 block">Swiss Alps</span>
                        <h3 className="font-serif text-xl">Winter Chalet</h3>
                    </div>
                </div>
                 {/* Small Item */}
                <div className="relative group overflow-hidden cursor-pointer">
                    <img src="https://images.unsplash.com/photo-1540541338287-41700207dee6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" alt="Resort" />
                    <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-deepNavy to-transparent w-full">
                         <span className="text-goldAccent text-xs font-bold uppercase tracking-widest mb-1 block">Maldives</span>
                        <h3 className="font-serif text-xl">Overwater Villa</h3>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-12">
                <button className="border border-white text-white px-8 py-3 uppercase text-xs font-bold tracking-widest hover:bg-white hover:text-deepNavy transition-colors">
                    View All Destinations
                </button>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-deepNavy text-white border-t border-white/10 pt-20 pb-10">
        <div className="container mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-1 md:col-span-1">
                    <span className="font-serif text-2xl font-bold tracking-wider block mb-6">StayNest<span className="text-goldAccent">.</span></span>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Curating the world&apos;s finest homes and experiences for the modern traveler. Experience luxury without limits.
                    </p>
                </div>
                <div>
                    <h4 className="text-goldAccent text-xs font-bold uppercase tracking-widest mb-6">Company</h4>
                    <ul className="space-y-4 text-sm text-gray-400">
                        {['About Us', 'Careers', 'Press', 'Sustainability'].map(item => (
                            <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="text-goldAccent text-xs font-bold uppercase tracking-widest mb-6">Support</h4>
                    <ul className="space-y-4 text-sm text-gray-400">
                         {['Concierge', 'Contact Us', 'Privacy Policy', 'Terms of Service'].map(item => (
                            <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="text-goldAccent text-xs font-bold uppercase tracking-widest mb-6">Follow Us</h4>
                    <div className="flex gap-4">
                        {[Instagram, Twitter, Paperclip].map((Icon, i) => (
                            <a key={i} href="#" className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center hover:bg-goldAccent hover:text-deepNavy hover:border-goldAccent transition-all">
                                <Icon className="w-4 h-4" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
                <p>&copy; 2025 StayNest Inc. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <span>Designed with elegance</span>
                </div>
            </div>
        </div>
      </footer>

      <ChatWidget />
    </main>
  );
}