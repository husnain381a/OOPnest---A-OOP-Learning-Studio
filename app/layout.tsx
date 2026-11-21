import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'OOPnest — Big concepts. Everyday examples.',description:'Learn object-oriented programming in C++ through familiar stories, Hindi and Urdu explanations, interactive lessons, and hands-on practice.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
