import { BookOpen, CalendarDays, GraduationCap, User } from"lucide-react";
import { cn } from"@/lib/utils";

type Tab ="studio" |"piano" |"pratica" |"profilo";

interface BottomNavProps {
 activeTab: Tab;
 onTabChange: (tab: Tab) => void;
}

const tabs = [
 { id:"studio" as Tab, label:"Studio", icon: BookOpen, color:"bg-primary-container text-primary" },
 { id:"piano" as Tab, label:"Piano", icon: CalendarDays, color:"bg-primary-container text-primary" },
 { id:"pratica" as Tab, label:"Pratica", icon: GraduationCap, color:"bg-primary-container text-primary" },
 { id:"profilo" as Tab, label:"Profilo", icon: User, color:"bg-primary-container text-primary" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
 return (
 <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-3 sm:px-4 pb-8 sm:pb-6 pointer-events-none">
 <div className="bg-white/70 backdrop-blur-md border-[0.5px] border-white/40 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pointer-events-auto rounded-full -translate-y-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out">
 <div className="flex items-center justify-around h-[4.5rem] sm:px-6 rounded-full opacity-100 shadow px-[10px] pb-0">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => onTabChange(tab.id)}
 className="flex flex-col items-center justify-center flex-1 py-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
 >
 <div
 className={cn(
"flex items-center justify-center rounded-full transition-all duration-600",
 isActive
 ? `${tab.color} w-16 h-9 shadow-level-1`
 :"w-12 h-9 bg-transparent group-hover:bg-foreground/[0.08]"
 )}
 style={{ transitionTimingFunction:"cubic-bezier(0.34, 1.56, 0.64, 1)" }}
 >
 <Icon
 className={cn(
"w-[22px] h-[22px] transition-all duration-400",
 isActive ?"" :"text-muted-foreground"
 )}
 fill={isActive ?"currentColor" :"none"}
 strokeWidth={isActive ? 2.2 : 1.8}
 />
 </div>
 <span
 className={cn(
"label-small mt-1.5 transition-all duration-400",
 isActive ?"text-foreground font-bold" :"text-muted-foreground"
 )}
 style={{ transitionTimingFunction:"cubic-bezier(0.34, 1.56, 0.64, 1)" }}
 >
 {tab.label}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 </nav>
 );
}
