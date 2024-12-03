import React from 'react';
import Link from 'next/link';
import { Home, Leaf, Settings } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white shadow-t border-t border-gray-100">
      <div className="max-w-md mx-auto">
        <div className="grid grid-cols-3 divide-x divide-gray-200">

        <Link href="/">
          <FooterNavItem
            icon={<Home className="w-6 h-6 text-emerald-600 group-hover:text-emerald-700 transition-colors" />}
            label="Home Page"
          /></Link>

           <Link href="/plantdigno">
          <FooterNavItem
            icon={<Leaf className="w-6 h-6 text-teal-600 group-hover:text-teal-700 transition-colors" />}
            label="Plant Diagnosis"
          /></Link>

        <Link href="/plantdigno">
          <FooterNavItem
            icon={<Settings className="w-6 h-6 text-lime-600 group-hover:text-lime-700 transition-colors" />}
            label="App Settings"
          /></Link>
          
        </div>
      </div>
    </footer>
  );
};

interface FooterNavItemProps {
  icon: React.ReactNode;
  label: string;
}

const FooterNavItem: React.FC<FooterNavItemProps> = ({ icon, label }) => {
  return (
    <div className="group">
      <button className="w-full flex flex-col items-center justify-center py-3 px-2 hover:bg-emerald-50/50 transition-colors">
        {icon}
        <span className="text-xs font-medium text-gray-600 group-hover:text-emerald-700 mt-1 transition-colors">
          {label}
        </span>
      </button>
    </div>
  );
};

export default Footer;
