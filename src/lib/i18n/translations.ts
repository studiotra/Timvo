export type Locale = "en" | "ko" | "zh" | "ja" | "fr" | "es";

export const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文 (Chinese)" },
  { value: "ko", label: "한국어 (Korean)" },
  { value: "ja", label: "日本語 (Japanese)" },
  { value: "fr", label: "Français (French)" },
  { value: "es", label: "Español (Spanish)" },
];

export function parseLocale(value: string | null | undefined): Locale {
  return LOCALE_OPTIONS.some((l) => l.value === value) ? (value as Locale) : "en";
}

const enKoTranslations: Record<"en" | "ko", {
    nav: {
      dashboard: string;
      clients: string;
      logs: string;
      invoices: string;
      services: string;
      reports: string;
      guide: string;
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
      guide: "Guide",
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
      guide: "가이드",
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

const zh = {
  ...enKoTranslations.en,
  nav: {
    dashboard: "仪表板",
    clients: "客户与项目",
    logs: "工时记录",
    invoices: "发票",
    services: "服务",
    reports: "报表",
    guide: "指南",
    settings: "设置",
    main: "主菜单",
  },
  common: {
    ...enKoTranslations.en.common,
    signOut: "退出登录",
    save: "保存",
    saved: "已保存",
    saving: "保存中…",
    saveSettings: "保存设置",
    back: "返回",
    add: "添加",
    edit: "编辑",
    delete: "删除",
    cancel: "取消",
    close: "关闭",
    loading: "加载中…",
    error: "错误",
  },
  logs: { title: "工时记录" },
  settings: {
    ...enKoTranslations.en.settings,
    title: "设置",
    profile: "个人资料",
    email: "邮箱",
    emailHint: "邮箱通过 Supabase Auth 管理。",
    language: "语言",
    languageLabel: "语言",
    business: "公司信息",
    fullName: "姓名",
    logoUrl: "Logo 网址",
    businessName: "公司名称",
    phoneNumber: "电话",
    address: "地址",
    bankPayments: "银行与收款",
    bankName: "银行名称",
    accountNumber: "账号（后四位）",
    routingNumber: "路由号",
    tax: "税务",
    taxRate: "税率 (%)",
    taxId: "税号",
    invoiceSettings: "发票设置",
    defaultDueDays: "默认到期天数",
    defaultFooter: "默认页脚",
    defaultTerms: "默认条款",
    defaultCurrency: "默认货币",
    invoicePrefix: "发票前缀",
    timezone: "时区",
    targetHourlyRate: "目标时薪",
    annualIncomeGoal: "年度收入目标",
  },
};

const ja = {
  ...enKoTranslations.en,
  nav: {
    dashboard: "ダッシュボード",
    clients: "顧客とプロジェクト",
    logs: "ログ",
    invoices: "請求書",
    services: "サービス",
    reports: "レポート",
    guide: "ガイド",
    settings: "設定",
    main: "メイン",
  },
  common: {
    ...enKoTranslations.en.common,
    signOut: "ログアウト",
    save: "保存",
    saved: "保存しました",
    saving: "保存中…",
    saveSettings: "設定を保存",
    back: "戻る",
    add: "追加",
    edit: "編集",
    delete: "削除",
    cancel: "キャンセル",
    close: "閉じる",
    loading: "読み込み中…",
    error: "エラー",
  },
  logs: { title: "ログ" },
  settings: {
    ...enKoTranslations.en.settings,
    title: "設定",
    profile: "プロフィール",
    email: "メール",
    emailHint: "メールは Supabase Auth で管理されます。",
    language: "言語",
    languageLabel: "言語",
    business: "事業者情報",
    fullName: "氏名",
    logoUrl: "ロゴ URL",
    businessName: "事業者名",
    phoneNumber: "電話番号",
    address: "住所",
    bankPayments: "銀行・支払い",
    bankName: "銀行名",
    accountNumber: "口座番号（下4桁）",
    routingNumber: "ルーティング番号",
    tax: "税",
    taxRate: "税率 (%)",
    taxId: "税務番号",
    invoiceSettings: "請求書設定",
    defaultDueDays: "既定の支払期限（日）",
    defaultFooter: "既定のフッター",
    defaultTerms: "既定の利用条件",
    defaultCurrency: "既定の通貨",
    invoicePrefix: "請求書プレフィックス",
    timezone: "タイムゾーン",
    targetHourlyRate: "目標時給",
    annualIncomeGoal: "年間収入目標",
  },
};

const fr = {
  ...enKoTranslations.en,
  nav: {
    dashboard: "Tableau de bord",
    clients: "Clients et projets",
    logs: "Journaux",
    invoices: "Factures",
    services: "Services",
    reports: "Rapports",
    guide: "Guide",
    settings: "Paramètres",
    main: "Principal",
  },
  common: {
    ...enKoTranslations.en.common,
    signOut: "Se déconnecter",
    save: "Enregistrer",
    saved: "Enregistré",
    saving: "Enregistrement…",
    saveSettings: "Enregistrer les paramètres",
    back: "Retour",
    add: "Ajouter",
    edit: "Modifier",
    delete: "Supprimer",
    cancel: "Annuler",
    close: "Fermer",
    loading: "Chargement…",
    error: "Erreur",
  },
  logs: { title: "Journaux" },
  settings: {
    ...enKoTranslations.en.settings,
    title: "Paramètres",
    profile: "Profil",
    email: "E-mail",
    emailHint: "L’e-mail est géré via Supabase Auth.",
    language: "Langue",
    languageLabel: "Langue",
    business: "Entreprise",
    fullName: "Nom complet",
    logoUrl: "URL du logo",
    businessName: "Nom de l’entreprise",
    phoneNumber: "Téléphone",
    address: "Adresse",
    bankPayments: "Banque et paiements",
    bankName: "Nom de la banque",
    accountNumber: "N° de compte (4 derniers)",
    routingNumber: "Code banque",
    tax: "Taxes",
    taxRate: "Taux de taxe (%)",
    taxId: "N° fiscal",
    invoiceSettings: "Paramètres de facture",
    defaultDueDays: "Échéance par défaut (jours)",
    defaultFooter: "Pied de page par défaut",
    defaultTerms: "Conditions par défaut",
    defaultCurrency: "Devise par défaut",
    invoicePrefix: "Préfixe de facture",
    timezone: "Fuseau horaire",
    targetHourlyRate: "Taux horaire cible",
    annualIncomeGoal: "Objectif de revenu annuel",
  },
};

const es = {
  ...enKoTranslations.en,
  nav: {
    dashboard: "Panel",
    clients: "Clientes y proyectos",
    logs: "Registros",
    invoices: "Facturas",
    services: "Servicios",
    reports: "Informes",
    guide: "Guía",
    settings: "Ajustes",
    main: "Principal",
  },
  common: {
    ...enKoTranslations.en.common,
    signOut: "Cerrar sesión",
    save: "Guardar",
    saved: "Guardado",
    saving: "Guardando…",
    saveSettings: "Guardar ajustes",
    back: "Volver",
    add: "Añadir",
    edit: "Editar",
    delete: "Eliminar",
    cancel: "Cancelar",
    close: "Cerrar",
    loading: "Cargando…",
    error: "Error",
  },
  logs: { title: "Registros" },
  settings: {
    ...enKoTranslations.en.settings,
    title: "Ajustes",
    profile: "Perfil",
    email: "Correo",
    emailHint: "El correo se gestiona con Supabase Auth.",
    language: "Idioma",
    languageLabel: "Idioma",
    business: "Negocio",
    fullName: "Nombre completo",
    logoUrl: "URL del logo",
    businessName: "Nombre del negocio",
    phoneNumber: "Teléfono",
    address: "Dirección",
    bankPayments: "Banco y pagos",
    bankName: "Nombre del banco",
    accountNumber: "N.º de cuenta (últimos 4)",
    routingNumber: "Número de ruta",
    tax: "Impuestos",
    taxRate: "Tasa impositiva (%)",
    taxId: "ID fiscal",
    invoiceSettings: "Ajustes de factura",
    defaultDueDays: "Vencimiento predeterminado (días)",
    defaultFooter: "Pie de página predeterminado",
    defaultTerms: "Términos predeterminados",
    defaultCurrency: "Moneda predeterminada",
    invoicePrefix: "Prefijo de factura",
    timezone: "Zona horaria",
    targetHourlyRate: "Tarifa por hora objetivo",
    annualIncomeGoal: "Meta de ingresos anuales",
  },
};

export const translations: Record<Locale, (typeof enKoTranslations)["en"]> = {
  en: enKoTranslations.en,
  ko: enKoTranslations.ko,
  zh,
  ja,
  fr,
  es,
};

