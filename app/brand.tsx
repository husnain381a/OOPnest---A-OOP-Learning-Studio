import { ListChecks } from 'lucide-react';
import { appName } from '../lib/content';

export function Brand() {
  return <a className="brand" href="#home" aria-label={`${appName} home`}>
    <span className="brand-mark"><ListChecks size={23} aria-hidden="true" /></span>
    <span><strong>{appName}</strong><small>Programming Fundamentals</small></span>
  </a>;
}
