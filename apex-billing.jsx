import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#111827",
  bgSecondary: "#1a2235",
  bgCard: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(99,102,241,0.4)",
  indigo: "#6366F1",
  indigoLight: "#818CF8",
  indigoDark: "#4F46E5",
  emerald: "#10B981",
  emeraldDim: "rgba(16,185,129,0.15)",
  amber: "#F59E0B",
  red: "#EF4444",
  textPrimary: "#F9FAFB",
  textSecondary: "#9CA3AF",
  textMuted: "#4B5563",
  white: "#FFFFFF",
};

const HEATMAP_DATA = [
  { day: "Mon", hours: 6.5, project: "Apex Design", color: "#6366F1" },
  { day: "Tue", hours: 8.0, project: "Branding Co.", color: "#10B981" },
  { day: "Wed", hours: 3.5, project: "Apex Design", color: "#6366F1" },
  { day: "Thu", hours: 7.0, project: "FinTech App", color: "#F59E0B" },
  { day: "Fri", hours: 2.0, project: "Branding Co.", color: "#10B981" },
];

const LOGS = [
  { id: 1, project: "Apex Design", desc: "redesigned hero section layout", time: "3h 15m", rate: "$120/hr", amount: "$390", billed: false, checked: true },
  { id: 2, project: "Apex Design", desc: "mobile responsiveness fixes", time: "1h 45m", rate: "$120/hr", amount: "$210", billed: false, checked: true },
  { id: 3, project: "Branding Co.", desc: "logo color revisions v4", time: "2h 00m", rate: "$150/hr", amount: "$300", billed: false, checked: true },
  { id: 4, project: "Branding Co.", desc: "brand guide PDF export", time: "1h 30m", rate: "$150/hr", amount: "$225", billed: false, checked: true },
  { id: 5, project: "FinTech App", desc: "dashboard widget components", time: "4h 00m", rate: "$140/hr", amount: "$560", billed: false, checked: true },
  { id: 6, project: "FinTech App", desc: "animation polish pass", time: "2h 30m", rate: "$140/hr", amount: "$350", billed: false, checked: false },
  { id: 7, project: "Apex Design", desc: "client feedback call notes", time: "0h 45m", rate: "$120/hr", amount: "$90", billed: false, checked: true },
];

const POLISHED = {
  "redesigned hero section layout": "Hero Section Architecture & Visual Hierarchy Optimization",
  "mobile responsiveness fixes": "Cross-Device Responsive Layout Engineering",
  "logo color revisions v4": "Visual Identity Refinement & Brand Consistency Calibration",
  "brand guide PDF export": "Brand Standards Documentation & Export Production",
  "dashboard widget components": "Interactive Dashboard Component System Development",
  "animation polish pass": "Micro-Interaction Design & Motion Language Refinement",
  "client feedback call notes": "Client Consultation & Strategic Alignment Session",
};

const INVOICES = [
  { id: "INV-041", client: "Apex Design Studio", amount: "$3,840", status: "paid", date: "Jun 1" },
  { id: "INV-040", client: "Branding Co.", amount: "$1,875", status: "sent", date: "May 28" },
  { id: "INV-039", client: "FinTech App", amount: "$2,100", status: "overdue", date: "May 15" },
  { id: "INV-038", client: "Branding Co.", amount: "$900", status: "paid", date: "May 8" },
];

const CLIENTS = [
  { name: "Apex Design Studio", email: "hello@apex.io", currency: "USD", active: true },
  { name: "Branding Co.", email: "work@brandingco.com", currency: "EUR", active: true },
  { name: "FinTech App", email: "pm@fintechapp.io", currency: "USD", active: true },
];

function formatTime(s) {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:wght@700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body { background: #111827; font-family: 'Space Grotesk', sans-serif; color: #F9FAFB; }
  
  .apex-app {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: #111827;
    position: relative;
  }
  
  /* Sidebar */
  .sidebar {
    width: 220px;
    min-width: 220px;
    background: #0D1424;
    border-right: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    padding: 0;
    position: relative;
    z-index: 10;
  }
  
  .sidebar-logo {
    padding: 24px 20px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  
  .logo-mark {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #6366F1, #818CF8);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: white;
    letter-spacing: -0.5px;
    box-shadow: 0 4px 12px rgba(99,102,241,0.4);
  }
  
  .logo-text {
    font-size: 15px;
    font-weight: 700;
    color: #F9FAFB;
    letter-spacing: -0.3px;
  }
  
  .logo-sub {
    font-size: 10px;
    color: #4B5563;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-weight: 500;
  }
  
  /* Active Timer Widget */
  .timer-widget {
    margin: 16px 12px;
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05));
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 12px;
    padding: 12px 14px;
    position: relative;
    overflow: hidden;
  }
  
  .timer-widget::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent);
  }
  
  .timer-label {
    font-size: 10px;
    color: #818CF8;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .timer-project {
    font-size: 11px;
    color: #9CA3AF;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .timer-display {
    font-family: 'JetBrains Mono', monospace;
    font-size: 22px;
    font-weight: 600;
    color: #F9FAFB;
    letter-spacing: -0.5px;
    margin-bottom: 10px;
  }
  
  .timer-active-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #10B981;
    border-radius: 50%;
    margin-right: 6px;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
  
  .timer-stop-btn {
    width: 100%;
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.3);
    color: #FCA5A5;
    font-size: 11px;
    font-weight: 600;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    letter-spacing: 0.5px;
    transition: all 0.2s;
    font-family: 'Space Grotesk', sans-serif;
  }
  
  .timer-stop-btn:hover {
    background: rgba(239,68,68,0.25);
    border-color: rgba(239,68,68,0.5);
  }
  
  /* Nav */
  .sidebar-nav {
    flex: 1;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .nav-section-label {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #374151;
    font-weight: 700;
    padding: 12px 8px 6px;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    color: #6B7280;
    font-size: 13px;
    font-weight: 500;
    position: relative;
  }
  
  .nav-item:hover {
    background: rgba(255,255,255,0.04);
    color: #D1D5DB;
  }
  
  .nav-item.active {
    background: rgba(99,102,241,0.12);
    color: #A5B4FC;
  }
  
  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 20px;
    background: #6366F1;
    border-radius: 0 2px 2px 0;
  }
  
  .nav-icon { font-size: 15px; width: 18px; text-align: center; }
  
  .nav-badge {
    margin-left: auto;
    background: #6366F1;
    color: white;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
  }
  
  /* Main Content */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  /* Top Bar */
  .topbar {
    background: rgba(13, 20, 36, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 0 32px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 5;
  }
  
  .topbar-title {
    font-size: 18px;
    font-weight: 700;
    color: #F9FAFB;
    letter-spacing: -0.4px;
  }
  
  .topbar-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .topbar-date {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #4B5563;
    font-weight: 500;
  }
  
  .avatar {
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, #6366F1, #EC4899);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: white;
    cursor: pointer;
    border: 2px solid rgba(99,102,241,0.3);
  }
  
  /* Content Area */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 28px 32px;
  }
  
  .content::-webkit-scrollbar { width: 4px; }
  .content::-webkit-scrollbar-track { background: transparent; }
  .content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
  
  /* Metric Cards */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  
  .metric-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    transition: all 0.2s;
    cursor: pointer;
    backdrop-filter: blur(10px);
  }
  
  .metric-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.02), transparent);
    border-radius: 14px;
  }
  
  .metric-card:hover {
    border-color: rgba(255,255,255,0.12);
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }
  
  .metric-card.highlight {
    background: rgba(99,102,241,0.08);
    border-color: rgba(99,102,241,0.25);
  }
  
  .metric-card.highlight:hover {
    border-color: rgba(99,102,241,0.4);
  }
  
  .metric-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  
  .metric-label {
    font-size: 11px;
    color: #6B7280;
    letter-spacing: 0.5px;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .metric-icon {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }
  
  .metric-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 26px;
    font-weight: 600;
    color: #F9FAFB;
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 6px;
  }
  
  .metric-sub {
    font-size: 11px;
    color: #6B7280;
    font-weight: 500;
  }
  
  .metric-sub.up { color: #10B981; }
  .metric-sub.down { color: #EF4444; }
  
  /* Dashboard Grid */
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 20px;
  }
  
  /* Panel */
  .panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    overflow: hidden;
  }
  
  .panel-header {
    padding: 18px 22px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .panel-title {
    font-size: 13px;
    font-weight: 700;
    color: #E5E7EB;
    letter-spacing: -0.2px;
  }
  
  .panel-sub {
    font-size: 11px;
    color: #4B5563;
    margin-top: 2px;
  }
  
  .panel-action {
    font-size: 11px;
    color: #6366F1;
    cursor: pointer;
    font-weight: 600;
    padding: 5px 12px;
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 6px;
    background: rgba(99,102,241,0.08);
    transition: all 0.15s;
  }
  
  .panel-action:hover {
    background: rgba(99,102,241,0.15);
    border-color: rgba(99,102,241,0.5);
  }
  
  /* Heatmap */
  .heatmap-body {
    padding: 22px;
  }
  
  .heatmap-bars {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    height: 120px;
    margin-bottom: 10px;
  }
  
  .heatmap-bar-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    height: 100%;
    justify-content: flex-end;
  }
  
  .heatmap-bar-hours {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #6B7280;
    font-weight: 500;
  }
  
  .heatmap-bar {
    width: 100%;
    border-radius: 6px 6px 0 0;
    position: relative;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .heatmap-bar:hover { filter: brightness(1.2); }
  
  .heatmap-bar-sheen {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 40%;
    background: linear-gradient(180deg, rgba(255,255,255,0.15), transparent);
    border-radius: 6px 6px 0 0;
  }
  
  .heatmap-label {
    font-size: 10px;
    color: #6B7280;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  
  .heatmap-baseline {
    height: 1px;
    background: rgba(255,255,255,0.06);
    margin: 0 0 10px;
  }
  
  .heatmap-legend {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #6B7280;
    font-weight: 500;
  }
  
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
  
  /* Unbilled Banner */
  .unbilled-banner {
    margin: 0 22px 16px;
    background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04));
    border: 1px solid rgba(99,102,241,0.25);
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .unbilled-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 22px;
    font-weight: 600;
    color: #A5B4FC;
    letter-spacing: -0.5px;
  }
  
  .unbilled-label {
    font-size: 11px;
    color: #6B7280;
    margin-top: 2px;
    font-weight: 500;
  }
  
  .generate-btn {
    background: linear-gradient(135deg, #6366F1, #4F46E5);
    color: white;
    border: none;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.2px;
    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
    transition: all 0.2s;
    font-family: 'Space Grotesk', sans-serif;
  }
  
  .generate-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(99,102,241,0.5);
  }
  
  /* Recent Logs */
  .logs-list {
    padding: 0 22px 22px;
  }
  
  .log-row {
    display: flex;
    align-items: center;
    padding: 11px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    gap: 12px;
  }
  
  .log-row:last-child { border-bottom: none; }
  
  .log-project-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .log-desc {
    flex: 1;
    font-size: 12px;
    color: #D1D5DB;
    font-weight: 500;
  }
  
  .log-project-tag {
    font-size: 10px;
    color: #6B7280;
    font-weight: 600;
  }
  
  .log-time {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #9CA3AF;
    font-weight: 500;
  }
  
  .log-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #F9FAFB;
    font-weight: 600;
    min-width: 50px;
    text-align: right;
  }
  
  .log-billable {
    font-size: 9px;
    padding: 2px 7px;
    border-radius: 4px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  
  .log-billable.yes {
    background: rgba(16,185,129,0.12);
    color: #6EE7B7;
  }
  
  .log-billable.no {
    background: rgba(107,114,128,0.12);
    color: #6B7280;
  }
  
  /* Invoice List */
  .invoice-list {
    padding: 0 0 4px;
  }
  
  .invoice-row {
    display: flex;
    align-items: center;
    padding: 12px 22px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    gap: 12px;
    transition: background 0.15s;
    cursor: pointer;
  }
  
  .invoice-row:last-child { border-bottom: none; }
  .invoice-row:hover { background: rgba(255,255,255,0.02); }
  
  .invoice-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #6366F1;
    font-weight: 600;
    min-width: 64px;
  }
  
  .invoice-client {
    flex: 1;
    font-size: 12px;
    color: #D1D5DB;
    font-weight: 500;
  }
  
  .invoice-date {
    font-size: 11px;
    color: #4B5563;
  }
  
  .invoice-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 600;
    color: #F9FAFB;
    min-width: 70px;
    text-align: right;
  }
  
  .status-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    min-width: 56px;
    text-align: center;
  }
  
  .status-badge.paid { background: rgba(16,185,129,0.12); color: #6EE7B7; }
  .status-badge.sent { background: rgba(99,102,241,0.12); color: #A5B4FC; }
  .status-badge.overdue { background: rgba(239,68,68,0.12); color: #FCA5A5; }
  .status-badge.draft { background: rgba(107,114,128,0.12); color: #9CA3AF; }
  
  /* ======= SLIDE-OVER ======= */
  .slideover-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    z-index: 50;
    animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
  
  .slideover {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: 560px;
    background: #0D1424;
    border-left: 1px solid rgba(255,255,255,0.08);
    z-index: 51;
    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .slideover-header {
    padding: 24px 28px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  
  .slideover-title {
    font-size: 18px;
    font-weight: 700;
    color: #F9FAFB;
    letter-spacing: -0.4px;
  }
  
  .slideover-sub {
    font-size: 12px;
    color: #6B7280;
    margin-top: 3px;
    font-weight: 500;
  }
  
  .close-btn {
    width: 30px;
    height: 30px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    color: #9CA3AF;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  
  .close-btn:hover { background: rgba(255,255,255,0.1); color: #F9FAFB; }
  
  .slideover-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
  }
  
  .slideover-body::-webkit-scrollbar { width: 4px; }
  .slideover-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  
  .select-row {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  
  .select-field {
    flex: 1;
  }
  
  .field-label {
    font-size: 10px;
    font-weight: 700;
    color: #6B7280;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 6px;
    display: block;
  }
  
  .field-select {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #E5E7EB;
    font-size: 13px;
    font-weight: 500;
    padding: 8px 12px;
    font-family: 'Space Grotesk', sans-serif;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
    appearance: none;
  }
  
  .field-select:focus { border-color: rgba(99,102,241,0.5); }
  
  /* AI Toggle */
  .ai-toggle-section {
    background: rgba(99,102,241,0.06);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  
  .ai-info { flex: 1; }
  
  .ai-title {
    font-size: 13px;
    font-weight: 700;
    color: #A5B4FC;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .ai-desc {
    font-size: 11px;
    color: #6B7280;
    margin-top: 2px;
    font-weight: 500;
  }
  
  .toggle {
    width: 40px;
    height: 22px;
    border-radius: 11px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .toggle.on {
    background: rgba(99,102,241,0.7);
    border-color: rgba(99,102,241,0.8);
    box-shadow: 0 0 12px rgba(99,102,241,0.4);
  }
  
  .toggle-knob {
    position: absolute;
    top: 2px; left: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }
  
  .toggle.on .toggle-knob { left: calc(100% - 18px); }
  
  /* Log Items */
  .logs-section-label {
    font-size: 10px;
    font-weight: 700;
    color: #4B5563;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  
  .log-check-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 8px;
    transition: all 0.15s;
    cursor: pointer;
    position: relative;
  }
  
  .log-check-item:hover { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.08); }
  
  .log-check-item.checked { 
    background: rgba(99,102,241,0.04);
    border-color: rgba(99,102,241,0.15);
  }
  
  .log-check-item.unchecked { opacity: 0.5; }
  
  .checkbox {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.15);
    background: transparent;
    flex-shrink: 0;
    margin-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  
  .checkbox.checked {
    background: #6366F1;
    border-color: #6366F1;
  }
  
  .checkbox-check {
    color: white;
    font-size: 9px;
    font-weight: 900;
  }
  
  .log-item-content { flex: 1; }
  
  .log-item-project {
    font-size: 10px;
    color: #6366F1;
    font-weight: 700;
    letter-spacing: 0.3px;
    margin-bottom: 3px;
    text-transform: uppercase;
  }
  
  .log-item-desc {
    font-size: 12px;
    color: #D1D5DB;
    font-weight: 500;
    line-height: 1.4;
    margin-bottom: 4px;
  }
  
  .log-item-desc.polished { color: #A5B4FC; font-style: italic; }
  
  .log-item-meta {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  
  .log-meta-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #6B7280;
    font-weight: 500;
  }
  
  .log-item-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 600;
    color: #F9FAFB;
  }
  
  /* Totals */
  .invoice-totals {
    background: rgba(255,255,255,0.02);
    border-top: 1px solid rgba(255,255,255,0.07);
    margin: 0 -28px;
    padding: 20px 28px;
  }
  
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .total-label {
    font-size: 12px;
    color: #6B7280;
    font-weight: 500;
  }
  
  .total-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #D1D5DB;
    font-weight: 600;
  }
  
  .total-final {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  
  .total-final .total-label {
    font-size: 14px;
    color: #F9FAFB;
    font-weight: 700;
  }
  
  .total-final .total-val {
    font-size: 22px;
    color: #F9FAFB;
  }
  
  /* Slideover Footer */
  .slideover-footer {
    padding: 20px 28px;
    border-top: 1px solid rgba(255,255,255,0.07);
    display: flex;
    gap: 12px;
    background: #0D1424;
  }
  
  .btn-secondary {
    flex: 1;
    padding: 11px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    color: #9CA3AF;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
    transition: all 0.15s;
  }
  
  .btn-secondary:hover { background: rgba(255,255,255,0.07); color: #F9FAFB; }
  
  .btn-primary {
    flex: 2;
    padding: 11px;
    background: linear-gradient(135deg, #6366F1, #4F46E5);
    border: none;
    color: white;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
    letter-spacing: 0.2px;
    transition: all 0.2s;
  }
  
  .btn-primary:hover {
    box-shadow: 0 6px 24px rgba(99,102,241,0.5);
    transform: translateY(-1px);
  }
  
  /* Sent State */
  .sent-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  }
  
  .sent-card {
    background: #0D1424;
    border: 1px solid rgba(16,185,129,0.3);
    border-radius: 20px;
    padding: 40px 48px;
    text-align: center;
    max-width: 380px;
    animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  
  .sent-icon {
    width: 64px;
    height: 64px;
    background: rgba(16,185,129,0.15);
    border: 2px solid rgba(16,185,129,0.4);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    margin: 0 auto 20px;
  }
  
  .sent-title {
    font-size: 22px;
    font-weight: 700;
    color: #F9FAFB;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }
  
  .sent-desc {
    font-size: 13px;
    color: #6B7280;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  
  .sent-amount {
    font-family: 'JetBrains Mono', monospace;
    font-size: 32px;
    font-weight: 600;
    color: #10B981;
    letter-spacing: -1px;
    margin-bottom: 6px;
  }
  
  .sent-amount-label {
    font-size: 11px;
    color: #4B5563;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 28px;
    font-weight: 600;
  }

  /* Tab Bar for Invoices/Clients Page  */
  .tab-bar {
    display: flex;
    gap: 4px;
    background: rgba(255,255,255,0.03);
    padding: 4px;
    border-radius: 10px;
    margin-bottom: 20px;
    border: 1px solid rgba(255,255,255,0.06);
    width: fit-content;
  }
  
  .tab-item {
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 600;
    color: #6B7280;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.15s;
  }
  
  .tab-item.active {
    background: rgba(99,102,241,0.15);
    color: #A5B4FC;
  }
  
  .tab-item:hover:not(.active) { color: #D1D5DB; }
  
  /* Clients grid */
  .clients-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  
  .client-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 18px;
    transition: all 0.2s;
    cursor: pointer;
  }
  
  .client-card:hover {
    border-color: rgba(99,102,241,0.3);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  
  .client-avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 800;
    color: white;
    margin-bottom: 12px;
  }
  
  .client-name {
    font-size: 14px;
    font-weight: 700;
    color: #F9FAFB;
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }
  
  .client-email {
    font-size: 11px;
    color: #6B7280;
    font-weight: 500;
    margin-bottom: 12px;
  }
  
  .client-currency-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 5px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 700;
    color: #9CA3AF;
    font-family: 'JetBrains Mono', monospace;
  }
  
  /* New Client btn */
  .new-client-card {
    background: transparent;
    border: 1px dashed rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 140px;
    cursor: pointer;
    transition: all 0.2s;
    color: #4B5563;
    gap: 8px;
  }
  
  .new-client-card:hover {
    border-color: rgba(99,102,241,0.4);
    color: #818CF8;
    background: rgba(99,102,241,0.04);
  }
  
  .new-client-card-icon {
    font-size: 24px;
    margin-bottom: 4px;
  }
  
  .new-client-card-label {
    font-size: 12px;
    font-weight: 600;
  }
  
  /* Settings */
  .settings-section {
    margin-bottom: 28px;
  }
  
  .settings-section-title {
    font-size: 11px;
    font-weight: 700;
    color: #4B5563;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  
  .settings-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    margin-bottom: 8px;
  }
  
  .settings-row-label {
    font-size: 13px;
    color: #E5E7EB;
    font-weight: 500;
  }
  
  .settings-row-val {
    font-size: 12px;
    color: #9CA3AF;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
  }
  
  .settings-edit {
    font-size: 11px;
    color: #6366F1;
    cursor: pointer;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 5px;
    background: rgba(99,102,241,0.08);
    transition: all 0.15s;
  }
  
  .settings-edit:hover { background: rgba(99,102,241,0.15); }
`;

const NAV_ITEMS = [
  { icon: "🏠", label: "Dashboard", id: "dashboard" },
  { icon: "📁", label: "Clients", id: "clients" },
  { icon: "🧾", label: "Invoices", id: "invoices" },
  { icon: "📊", label: "Reports", id: "reports" },
  { icon: "⚙️", label: "Settings", id: "settings" },
];

const PROJECT_COLORS = {
  "Apex Design": "#6366F1",
  "Branding Co.": "#10B981",
  "FinTech App": "#F59E0B",
};

export default function ApexBilling() {
  const [page, setPage] = useState("dashboard");
  const [timerRunning, setTimerRunning] = useState(true);
  const [timerSecs, setTimerSecs] = useState(8547); // 2h 22m 27s
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [aiPolish, setAiPolish] = useState(false);
  const [logs, setLogs] = useState(LOGS);
  const [sentState, setSentState] = useState(false);
  const [sentAmount, setSentAmount] = useState("0");

  useEffect(() => {
    if (!timerRunning) return;
    const t = setInterval(() => setTimerSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [timerRunning]);

  const totalChecked = logs.filter(l => l.checked).reduce((acc, l) => {
    const n = parseFloat(l.amount.replace("$", "").replace(",", ""));
    return acc + n;
  }, 0);

  const handleSend = () => {
    setSentAmount(`$${totalChecked.toLocaleString()}`);
    setShowInvoiceModal(false);
    setSentState(true);
    setTimeout(() => setSentState(false), 4000);
  };

  return (
    <>
      <style>{css}</style>
      <div className="apex-app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">
              <div className="logo-icon">AB</div>
              <div>
                <div className="logo-text">Apex Billing</div>
                <div className="logo-sub">Freelance OS</div>
              </div>
            </div>
          </div>

          {/* Active Timer */}
          <div className="timer-widget">
            <div className="timer-label">
              <span className="timer-active-dot" />
              Active Session
            </div>
            <div className="timer-project">Apex Design · Hero Redesign</div>
            <div className="timer-display">{formatTime(timerSecs)}</div>
            <button className="timer-stop-btn" onClick={() => setTimerRunning(false)}>
              ■ &nbsp;Stop Timer
            </button>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Main</div>
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => setPage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.id === "invoices" && <span className="nav-badge">3</span>}
              </div>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">
              {page === "dashboard" && "Dashboard"}
              {page === "clients" && "Clients & Projects"}
              {page === "invoices" && "Invoices"}
              {page === "reports" && "Reports"}
              {page === "settings" && "Settings"}
            </div>
            <div className="topbar-right">
              <span className="topbar-date">FRI, JUN 06, 2025</span>
              <div className="avatar">JD</div>
            </div>
          </div>

          <div className="content">
            {page === "dashboard" && (
              <DashboardPage logs={logs} onGenerate={() => setShowInvoiceModal(true)} timerSecs={timerSecs} />
            )}
            {page === "clients" && <ClientsPage />}
            {page === "invoices" && <InvoicesPage />}
            {page === "reports" && <ReportsPage />}
            {page === "settings" && <SettingsPage />}
          </div>
        </main>

        {/* Invoice Slide-over */}
        {showInvoiceModal && (
          <>
            <div className="slideover-overlay" onClick={() => setShowInvoiceModal(false)} />
            <div className="slideover">
              <div className="slideover-header">
                <div>
                  <div className="slideover-title">Generate Invoice</div>
                  <div className="slideover-sub">{logs.filter(l => l.checked).length} logs selected · Week of Jun 2–6</div>
                </div>
                <button className="close-btn" onClick={() => setShowInvoiceModal(false)}>✕</button>
              </div>

              <div className="slideover-body">
                {/* Client & Date */}
                <div className="select-row">
                  <div className="select-field">
                    <label className="field-label">Bill To</label>
                    <select className="field-select" style={{ background: "#111827" }}>
                      <option>Apex Design Studio</option>
                      <option>Branding Co.</option>
                      <option>FinTech App</option>
                    </select>
                  </div>
                  <div className="select-field">
                    <label className="field-label">Due Date</label>
                    <select className="field-select" style={{ background: "#111827" }}>
                      <option>Net 15 (Jun 21)</option>
                      <option>Net 30 (Jul 6)</option>
                      <option>Due on Receipt</option>
                    </select>
                  </div>
                </div>

                {/* AI Toggle */}
                <div className="ai-toggle-section">
                  <div className="ai-info">
                    <div className="ai-title">✦ AI Log Polisher</div>
                    <div className="ai-desc">Transform raw notes into professional line items</div>
                  </div>
                  <div className="toggle" onClick={() => setAiPolish(v => !v)} style={aiPolish ? {} : {}}>
                    <div className={`toggle ${aiPolish ? "on" : ""}`} onClick={() => setAiPolish(v => !v)}>
                      <div className="toggle-knob" />
                    </div>
                  </div>
                </div>

                <div className="logs-section-label">Time Logs — Select to Include</div>

                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`log-check-item ${log.checked ? "checked" : "unchecked"}`}
                    onClick={() => setLogs(prev => prev.map(l => l.id === log.id ? { ...l, checked: !l.checked } : l))}
                  >
                    <div className={`checkbox ${log.checked ? "checked" : ""}`}>
                      {log.checked && <span className="checkbox-check">✓</span>}
                    </div>
                    <div className="log-item-content">
                      <div className="log-item-project">{log.project}</div>
                      <div className={`log-item-desc ${aiPolish && log.checked ? "polished" : ""}`}>
                        {aiPolish && log.checked ? POLISHED[log.desc] || log.desc : log.desc}
                      </div>
                      <div className="log-item-meta">
                        <span className="log-meta-val">{log.time}</span>
                        <span className="log-meta-val">·</span>
                        <span className="log-meta-val">{log.rate}</span>
                      </div>
                    </div>
                    <div className="log-item-amount">{log.amount}</div>
                  </div>
                ))}

                <div className="invoice-totals" style={{ marginTop: 16 }}>
                  <div className="total-row">
                    <span className="total-label">Subtotal</span>
                    <span className="total-val">${totalChecked.toLocaleString()}</span>
                  </div>
                  <div className="total-row">
                    <span className="total-label">Tax (0%)</span>
                    <span className="total-val">—</span>
                  </div>
                  <div className="total-row total-final">
                    <span className="total-label">Total Due</span>
                    <span className="total-val">${totalChecked.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="slideover-footer">
                <button className="btn-secondary">Save Draft</button>
                <button className="btn-primary" onClick={handleSend}>
                  ⚡ Send & Lock
                </button>
              </div>
            </div>
          </>
        )}

        {/* Sent confirmation */}
        {sentState && (
          <div className="sent-overlay" onClick={() => setSentState(false)}>
            <div className="sent-card">
              <div className="sent-icon">✓</div>
              <div className="sent-title">Invoice Sent!</div>
              <div className="sent-amount">{sentAmount}</div>
              <div className="sent-amount-label">Invoice INV-042 · Apex Design Studio</div>
              <div className="sent-desc">
                PDF generated and emailed via Stripe. {logs.filter(l => l.checked).length} logs locked as billed. Your client can pay by card directly from the email.
              </div>
              <button
                onClick={() => setSentState(false)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  borderRadius: "10px",
                  color: "#6EE7B7",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DashboardPage({ logs, onGenerate, timerSecs }) {
  const maxHours = Math.max(...HEATMAP_DATA.map(d => d.hours));
  return (
    <>
      <div className="metrics-grid">
        <MetricCard
          label="This Month"
          value="$12,840"
          sub="↑ 18% vs last month"
          subClass="up"
          icon="💰"
          iconBg="rgba(16,185,129,0.1)"
        />
        <MetricCard
          label="Unbilled"
          value="$2,450"
          sub="7 logs · 3 projects"
          icon="⏳"
          iconBg="rgba(245,158,11,0.1)"
          highlight
        />
        <MetricCard
          label="Hours This Week"
          value="27.0h"
          sub="↑ 3.5h vs last week"
          subClass="up"
          icon="⏱"
          iconBg="rgba(99,102,241,0.1)"
        />
        <MetricCard
          label="Avg. Daily Rate"
          value="$680"
          sub="↓ $40 vs last week"
          subClass="down"
          icon="📈"
          iconBg="rgba(239,68,68,0.1)"
        />
      </div>

      <div className="dashboard-grid">
        {/* Left Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Heatmap */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Weekly Activity</div>
                <div className="panel-sub">Jun 2–6, 2025</div>
              </div>
              <button className="panel-action">+ Manual Log</button>
            </div>
            <div className="heatmap-body">
              <div className="heatmap-bars">
                {HEATMAP_DATA.map(d => {
                  const pct = d.hours / maxHours;
                  return (
                    <div className="heatmap-bar-wrap" key={d.day}>
                      <div className="heatmap-bar-hours">{d.hours}h</div>
                      <div
                        className="heatmap-bar"
                        style={{
                          height: `${pct * 100}px`,
                          background: `linear-gradient(180deg, ${d.color}99, ${d.color}55)`,
                          border: `1px solid ${d.color}44`,
                        }}
                      >
                        <div className="heatmap-bar-sheen" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="heatmap-baseline" />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {HEATMAP_DATA.map(d => (
                  <div key={d.day} style={{ flex: 1, textAlign: "center" }}>
                    <span className="heatmap-label">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="heatmap-legend">
                {Object.entries(PROJECT_COLORS).map(([name, color]) => (
                  <div className="legend-item" key={name}>
                    <div className="legend-dot" style={{ background: color }} />
                    {name}
                  </div>
                ))}
              </div>
            </div>

            {/* Unbilled banner */}
            <div className="unbilled-banner">
              <div>
                <div className="unbilled-amount">$2,450.00</div>
                <div className="unbilled-label">Unbilled this week · 7 logs</div>
              </div>
              <button className="generate-btn" onClick={onGenerate}>
                ⚡ Generate Invoice
              </button>
            </div>
          </div>

          {/* Recent Logs */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Recent Logs</div>
              </div>
              <span className="panel-action">View All</span>
            </div>
            <div className="logs-list">
              {logs.slice(0, 6).map(log => (
                <div className="log-row" key={log.id}>
                  <div
                    className="log-project-dot"
                    style={{ background: PROJECT_COLORS[log.project] || "#6B7280" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="log-desc">{log.desc}</div>
                    <div className="log-project-tag">{log.project}</div>
                  </div>
                  <span className="log-time">{log.time}</span>
                  <span className={`log-billable ${log.billed ? "no" : "yes"}`}>
                    {log.billed ? "BILLED" : "UNBILLED"}
                  </span>
                  <span className="log-amount">{log.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="panel-header">
            <div>
              <div className="panel-title">Recent Invoices</div>
            </div>
            <span className="panel-action" style={{ fontSize: 10, letterSpacing: 0.5 }}>+ New</span>
          </div>
          <div className="invoice-list">
            {INVOICES.map(inv => (
              <div className="invoice-row" key={inv.id}>
                <div>
                  <div className="invoice-id">{inv.id}</div>
                  <div className="invoice-client">{inv.client}</div>
                  <div className="invoice-date">{inv.date}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div className="invoice-amount">{inv.amount}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`status-badge ${inv.status}`}>{inv.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div style={{ margin: "12px 22px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 10, color: "#4B5563", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
              Revenue Breakdown
            </div>
            {[
              { label: "Apex Design", pct: 48, color: "#6366F1" },
              { label: "FinTech App", pct: 35, color: "#F59E0B" },
              { label: "Branding Co.", pct: 17, color: "#10B981" },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#6B7280" }}>{item.pct}%</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${item.pct}%`, background: item.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({ label, value, sub, subClass = "", icon, iconBg, highlight }) {
  return (
    <div className={`metric-card ${highlight ? "highlight" : ""}`}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <div className="metric-icon" style={{ background: iconBg }}>{icon}</div>
      </div>
      <div className="metric-value">{value}</div>
      <div className={`metric-sub ${subClass}`}>{sub}</div>
    </div>
  );
}

function ClientsPage() {
  const avatarColors = ["linear-gradient(135deg,#6366F1,#818CF8)", "linear-gradient(135deg,#10B981,#34D399)", "linear-gradient(135deg,#F59E0B,#FBBF24)"];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#9CA3AF" }}>3 active clients</div>
        <button className="generate-btn" style={{ fontSize: 12 }}>+ Add Client</button>
      </div>
      <div className="clients-grid">
        {CLIENTS.map((c, i) => (
          <div className="client-card" key={c.name}>
            <div className="client-avatar" style={{ background: avatarColors[i] }}>
              {c.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </div>
            <div className="client-name">{c.name}</div>
            <div className="client-email">{c.email}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="client-currency-tag">{c.currency}</span>
              <span style={{ fontSize: 9, color: "#10B981", fontWeight: 700, padding: "2px 7px", background: "rgba(16,185,129,0.1)", borderRadius: 4 }}>ACTIVE</span>
            </div>
          </div>
        ))}
        <div className="new-client-card">
          <div className="new-client-card-icon">+</div>
          <div className="new-client-card-label">New Client</div>
        </div>
      </div>

      {/* Projects */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
        Projects
      </div>
      <div className="panel">
        {[
          { name: "Hero Section Redesign", client: "Apex Design", rate: "$120/hr", type: "Hourly", status: "active" },
          { name: "Brand Identity System", client: "Branding Co.", rate: "$150/hr", type: "Hourly", status: "active" },
          { name: "Dashboard MVP", client: "FinTech App", rate: "$5,000", type: "Fixed", status: "active" },
          { name: "Logo Design V1", client: "Branding Co.", rate: "$1,200", type: "Fixed", status: "archived" },
        ].map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "13px 20px", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none", gap: 14, cursor: "pointer" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: PROJECT_COLORS[p.client] || "#6B7280", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#E5E7EB", fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{p.client}</div>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#9CA3AF" }}>{p.rate}</span>
            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, fontWeight: 700, background: "rgba(255,255,255,0.05)", color: "#6B7280" }}>{p.type.toUpperCase()}</span>
            <span className={`status-badge ${p.status === "active" ? "paid" : "draft"}`} style={{ fontSize: 9 }}>{p.status.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function InvoicesPage() {
  const allInvoices = [
    { id: "INV-042", client: "Apex Design Studio", amount: "$2,450", status: "draft", date: "Jun 6" },
    ...INVOICES,
    { id: "INV-037", client: "FinTech App", amount: "$4,200", status: "paid", date: "Apr 30" },
  ];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div className="tab-bar">
          {["All", "Draft", "Sent", "Paid", "Overdue"].map(t => (
            <div key={t} className={`tab-item ${t === "All" ? "active" : ""}`}>{t}</div>
          ))}
        </div>
        <button className="generate-btn" style={{ fontSize: 12 }}>+ New Invoice</button>
      </div>
      <div className="panel">
        <div style={{ padding: "12px 22px 0", display: "flex", gap: 12 }}>
          <span style={{ flex: "0 0 70px", fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "1px", textTransform: "uppercase" }}>ID</span>
          <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "1px", textTransform: "uppercase" }}>Client</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "1px", textTransform: "uppercase", minWidth: 60 }}>Date</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "1px", textTransform: "uppercase", minWidth: 80, textAlign: "right" }}>Amount</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "1px", textTransform: "uppercase", minWidth: 70, textAlign: "center" }}>Status</span>
        </div>
        {allInvoices.map(inv => (
          <div className="invoice-row" key={inv.id} style={{ gap: 12 }}>
            <span className="invoice-id" style={{ minWidth: 70 }}>{inv.id}</span>
            <span className="invoice-client">{inv.client}</span>
            <span className="invoice-date" style={{ minWidth: 60 }}>{inv.date}</span>
            <span className="invoice-amount" style={{ minWidth: 80 }}>{inv.amount}</span>
            <span className={`status-badge ${inv.status}`} style={{ minWidth: 70 }}>{inv.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ReportsPage() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const values = [4200, 6800, 5100, 9200, 11400, 12840];
  const max = Math.max(...values);
  return (
    <div>
      <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <MetricCard label="YTD Revenue" value="$49,540" sub="↑ 24% vs last year" subClass="up" icon="📊" iconBg="rgba(99,102,241,0.1)" />
        <MetricCard label="Total Hours" value="487h" sub="↑ 42h vs last year" subClass="up" icon="⏱" iconBg="rgba(16,185,129,0.1)" />
        <MetricCard label="Effective Rate" value="$101/hr" sub="↑ $9 vs last year" subClass="up" icon="💡" iconBg="rgba(245,158,11,0.1)" />
      </div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Monthly Revenue — 2025</div>
        </div>
        <div style={{ padding: "24px 28px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 180 }}>
            {months.map((m, i) => {
              const pct = values[i] / max;
              return (
                <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#6B7280" }}>${(values[i] / 1000).toFixed(1)}k</span>
                  <div style={{
                    width: "100%",
                    height: `${pct * 160}px`,
                    background: i === 5 ? "linear-gradient(180deg,#6366F1,#4F46E5)" : "linear-gradient(180deg,rgba(99,102,241,0.4),rgba(99,102,241,0.15))",
                    borderRadius: "6px 6px 0 0",
                    border: `1px solid ${i === 5 ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.2)"}`,
                    position: "relative",
                    boxShadow: i === 5 ? "0 0 20px rgba(99,102,241,0.3)" : "none",
                  }} />
                  <span style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, letterSpacing: 0.5 }}>{m}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div style={{ maxWidth: 640 }}>
      <div className="settings-section">
        <div className="settings-section-title">Profile</div>
        <div className="settings-row">
          <span className="settings-row-label">Full Name</span>
          <span className="settings-row-val">Jane Doe</span>
          <span className="settings-edit">Edit</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Email</span>
          <span className="settings-row-val">jane@freelance.io</span>
          <span className="settings-edit">Edit</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Business Name</span>
          <span className="settings-row-val">Jane Doe Design Co.</span>
          <span className="settings-edit">Edit</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Bank & Payments</div>
        <div className="settings-row">
          <span className="settings-row-label">Stripe Connect</span>
          <span style={{ fontSize: 9, padding: "2px 8px", background: "rgba(16,185,129,0.1)", color: "#6EE7B7", fontWeight: 700, borderRadius: 4, letterSpacing: 0.5 }}>CONNECTED</span>
          <span className="settings-edit">Manage</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Default Currency</span>
          <span className="settings-row-val">USD</span>
          <span className="settings-edit">Change</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Tax</div>
        <div className="settings-row">
          <span className="settings-row-label">Tax Rate</span>
          <span className="settings-row-val">0%</span>
          <span className="settings-edit">Set</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Tax ID</span>
          <span className="settings-row-val">—</span>
          <span className="settings-edit">Add</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Invoice Prefix</span>
          <span className="settings-row-val">INV-</span>
          <span className="settings-edit">Edit</span>
        </div>
      </div>
    </div>
  );
}
