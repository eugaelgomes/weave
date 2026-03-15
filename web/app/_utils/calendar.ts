

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEK_DAYS_PT = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

const WEEK_DAYS_EN = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

const calendarUtils = {
  months: {
    pt: MONTH_NAMES_PT,
    en: MONTH_NAMES_EN
  },
  weekDays: {
    pt: WEEK_DAYS_PT,
    en: WEEK_DAYS_EN
  },
};

module.exports = {
  calendarUtils,
};