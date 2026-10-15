// Feature flag-ууд — env-ээс шууд (build/static хуудсанд ч ажиллана).

/**
 * CUSTOM_PUBLIC=true үед /custom форм нийтэд нээлттэй, #order дахь "Өөрийн логотой" карт /custom руу.
 * Анхдагч false: /custom нь зөвхөн админ cookie-тэй үед, карт чат руу. /c/<token> үргэлж token-оор ажиллана.
 */
export const customPublic = () => process.env.CUSTOM_PUBLIC === "true";
