export type Locale = "en" | "ko";

export const translations: Record<
  Locale,
  {
    nav: {
      dashboard: string;
      clients: string;
      logs: string;
      invoices: string;
      services: string;
      reports: string;
      settings: string;
      main: string;
    };
    common: {
      signOut: string;
      save: string;
      saved: string;
      saving: string;
      saveSettings: string;
      back: string;
      add: string;
      edit: string;
      delete: string;
      cancel: string;
      close: string;
      loading: string;
      error: string;
    };
    dashboard: {
      thisMonth: string;
      paidInvoices: string;
      unbilled: string;
      unbilledValue: string;
      weekTotal: string;
      totalTracked: string;
      received: string;
      receivedValue: string;
      recentLogs: string;
      recentInvoices: string;
      last7Days: string;
      logsReady: string;
      noLogs: string;
      noInvoices: string;
      viewAll: string;
      createInvoice: string;
      addLog: string;
      manualLog: string;
      generateInvoice: string;
      weeklyActivity: string;
      effectiveRate: string;
      mostProfitableClient: string;
      projectedAnnual: string;
      thisMonthRevenue: string;
      lastMonthRevenue: string;
      ytd: string;
    };
    clients: {
      title: string;
      activeClients: string;
      activeClient: string;
      addClient: string;
      newClient: string;
      addProject: string;
      backToClients: string;
      clientsAndProjects: string;
    };
    logs: {
      title: string;
    };
    invoices: {
      title: string;
      backToInvoices: string;
      createInvoice: string;
    };
    services: {
      title: string;
    };
    reports: {
      title: string;
    };
    settings: {
      title: string;
      profile: string;
      email: string;
      emailHint: string;
      language: string;
      languageLabel: string;
      business: string;
      fullName: string;
      logoUrl: string;
      businessName: string;
      phoneNumber: string;
      address: string;
      bankPayments: string;
      bankName: string;
      accountNumber: string;
      routingNumber: string;
      tax: string;
      taxRate: string;
      taxId: string;
      invoiceSettings: string;
      defaultDueDays: string;
      defaultFooter: string;
      defaultTerms: string;
      defaultCurrency: string;
      invoicePrefix: string;
      timezone: string;
      targetHourlyRate: string;
      annualIncomeGoal: string;
    };
    clientPortal: {
      yourClients: string;
      selectClient: string;
      viewRecords: string;
      timeRecords: string;
      totalHours: string;
      unbilled: string;
      projects: string;
      timeLogs: string;
      date: string;
      project: string;
      task: string;
      description: string;
      duration: string;
      billable: string;
      billed: string;
      yes: string;
      no: string;
      noLogs: string;
      noProjects: string;
      backToClients: string;
    };
  }
> = {
  en: {
    nav: {
      dashboard: "Dashboard",
      clients: "Clients & Projects",
      logs: "Logs",
      invoices: "Invoices",
      services: "Services",
      reports: "Reports",
      settings: "Settings",
      main: "Main",
    },
    common: {
      signOut: "Sign out",
      save: "Save",
      saved: "Saved!",
      saving: "Saving…",
      saveSettings: "Save Settings",
      back: "Back",
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel",
      close: "Close",
      loading: "Loading…",
      error: "Error",
    },
    dashboard: {
      thisMonth: "This Month",
      paidInvoices: "Paid invoices",
      unbilled: "Unbilled",
      unbilledValue: "ready to invoice",
      weekTotal: "This week",
      totalTracked: "Total tracked",
      received: "Received this month",
      receivedValue: "paid invoices",
      recentLogs: "Recent Logs",
      recentInvoices: "Recent Invoices",
      last7Days: "Last 7 days",
      logsReady: "logs ready",
      noLogs: "No recent logs",
      noInvoices: "No recent invoices",
      viewAll: "View all",
      createInvoice: "Create invoice",
      addLog: "Add log",
      manualLog: "Manual Log",
      generateInvoice: "Generate Invoice",
      weeklyActivity: "Weekly Activity",
      effectiveRate: "Effective Hourly Rate",
      mostProfitableClient: "Most Profitable Client",
      projectedAnnual: "Projected Annual",
      thisMonthRevenue: "This month",
      lastMonthRevenue: "Last month",
      ytd: "YTD",
    },
    clients: {
      title: "Clients & Projects",
      activeClients: "active clients",
      activeClient: "active client",
      addClient: "Add Client",
      newClient: "New Client",
      addProject: "Add Project",
      backToClients: "← Back to Clients & Projects",
      clientsAndProjects: "Clients & Projects",
    },
    logs: { title: "Logs" },
    invoices: {
      title: "Invoices",
      backToInvoices: "← Back to Invoices",
      createInvoice: "Create invoice",
    },
    services: { title: "Services" },
    reports: { title: "Reports" },
    settings: {
      title: "Settings",
      profile: "Profile",
      email: "Email",
      emailHint: "Email is managed via Supabase Auth.",
      language: "Language",
      languageLabel: "Language / 언어",
      business: "Business",
      fullName: "Full Name",
      logoUrl: "Logo URL",
      businessName: "Business Name",
      phoneNumber: "Phone Number",
      address: "Address",
      bankPayments: "Bank & Payments",
      bankName: "Bank Name",
      accountNumber: "Account Number (last 4)",
      routingNumber: "Routing Number",
      tax: "Tax",
      taxRate: "Tax Rate (%)",
      taxId: "Tax ID",
      invoiceSettings: "Invoice Settings",
      defaultDueDays: "Default Due Date (days from issue)",
      defaultFooter: "Default Footer",
      defaultTerms: "Default Terms & Conditions",
      defaultCurrency: "Default Currency",
      invoicePrefix: "Invoice Prefix",
      timezone: "Timezone",
      targetHourlyRate: "Target Hourly Rate",
      annualIncomeGoal: "Annual Income Goal",
    },
    clientPortal: {
      yourClients: "Your clients",
      selectClient: "Select a client to view their time records.",
      viewRecords: "View time records",
      timeRecords: "Time records (read-only)",
      totalHours: "Total hours",
      unbilled: "Unbilled",
      projects: "Projects",
      timeLogs: "Time logs",
      date: "Date",
      project: "Project",
      task: "Task",
      description: "Description",
      duration: "Duration",
      billable: "Billable",
      billed: "Billed",
      yes: "Yes",
      no: "No",
      noLogs: "No time logs yet.",
      noProjects: "No projects yet.",
      backToClients: "← Back to clients",
    },
  },
  ko: {
    nav: {
      dashboard: "대시보드",
      clients: "고객 및 프로젝트",
      logs: "기록",
      invoices: "인보이스",
      services: "서비스",
      reports: "보고서",
      settings: "설정",
      main: "메인",
    },
    common: {
      signOut: "로그아웃",
      save: "저장",
      saved: "저장되었습니다!",
      saving: "저장 중…",
      saveSettings: "설정 저장",
      back: "뒤로",
      add: "추가",
      edit: "편집",
      delete: "삭제",
      cancel: "취소",
      close: "닫기",
      loading: "로딩 중…",
      error: "오류",
    },
    dashboard: {
      thisMonth: "이번 달",
      paidInvoices: "결제 완료 인보이스",
      unbilled: "미청구",
      unbilledValue: "인보이스 대기",
      weekTotal: "이번 주",
      totalTracked: "총 기록",
      received: "이번 달 수입",
      receivedValue: "결제 완료",
      recentLogs: "최근 기록",
      recentInvoices: "최근 인보이스",
      last7Days: "최근 7일",
      logsReady: "건 준비됨",
      noLogs: "최근 기록 없음",
      noInvoices: "최근 인보이스 없음",
      viewAll: "전체 보기",
      createInvoice: "인보이스 생성",
      addLog: "기록 추가",
      manualLog: "수동 기록",
      generateInvoice: "인보이스 생성",
      weeklyActivity: "주간 활동",
      effectiveRate: "실질 시급",
      mostProfitableClient: "가장 수익성 높은 고객",
      projectedAnnual: "연간 예상 수익",
      thisMonthRevenue: "이번 달",
      lastMonthRevenue: "지난달",
      ytd: "연초부터",
    },
    clients: {
      title: "고객 및 프로젝트",
      activeClients: "명의 고객",
      activeClient: "명의 고객",
      addClient: "고객 추가",
      newClient: "새 고객",
      addProject: "프로젝트 추가",
      backToClients: "← 고객 및 프로젝트로",
      clientsAndProjects: "고객 및 프로젝트",
    },
    logs: { title: "기록" },
    invoices: {
      title: "인보이스",
      backToInvoices: "← 인보이스로",
      createInvoice: "인보이스 생성",
    },
    services: { title: "서비스" },
    reports: { title: "보고서" },
    settings: {
      title: "설정",
      profile: "프로필",
      email: "이메일",
      emailHint: "이메일은 Supabase Auth에서 관리됩니다.",
      language: "언어",
      languageLabel: "Language / 언어",
      business: "사업자 정보",
      fullName: "이름",
      logoUrl: "로고 URL",
      businessName: "사업자명",
      phoneNumber: "전화번호",
      address: "주소",
      bankPayments: "은행 및 결제",
      bankName: "은행명",
      accountNumber: "계좌번호 (마지막 4자리)",
      routingNumber: "라우팅 번호",
      tax: "세금",
      taxRate: "세율 (%)",
      taxId: "사업자등록번호",
      invoiceSettings: "인보이스 설정",
      defaultDueDays: "기본 마감일 (발행일 기준 일수)",
      defaultFooter: "기본 푸터",
      defaultTerms: "기본 이용약관",
      defaultCurrency: "기본 통화",
      invoicePrefix: "인보이스 접두사",
      timezone: "시간대",
      targetHourlyRate: "목표 시간당 요금",
      annualIncomeGoal: "연간 수익 목표",
    },
    clientPortal: {
      yourClients: "고객 목록",
      selectClient: "시간 기록을 보려면 고객을 선택하세요.",
      viewRecords: "시간 기록 보기",
      timeRecords: "시간 기록 (읽기 전용)",
      totalHours: "총 시간",
      unbilled: "미청구",
      projects: "프로젝트",
      timeLogs: "시간 기록",
      date: "날짜",
      project: "프로젝트",
      task: "작업",
      description: "설명",
      duration: "소요 시간",
      billable: "청구 가능",
      billed: "청구 완료",
      yes: "예",
      no: "아니오",
      noLogs: "기록이 없습니다.",
      noProjects: "프로젝트가 없습니다.",
      backToClients: "← 고객 목록으로",
    },
  },
};
