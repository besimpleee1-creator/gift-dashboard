export type Gift = {
  id: string;
  name: string;
  description: string;
  url: string;
  image: string;
  accent: string;
};

export const gifts: Gift[] = [
  {
    id: 'animals',
    name: 'Дикие и домашние животные',
    description: 'Набор из 24 фигурок животных и птиц',
    url: 'https://www.wildberries.ru/catalog/301693868/detail.aspx?size=458451992',
    image: '/gifts/animals.svg',
    accent: 'lilac',
  },
  {
    id: 'vegetable-sorter',
    name: 'Сортер овощей',
    description: 'Развивающая игрушка Montessori',
    url: 'https://www.wildberries.ru/catalog/1345380179/detail.aspx?size=1998734944',
    image: '/gifts/vegetables.svg',
    accent: 'mint',
  },
  {
    id: 'avent-cup',
    name: 'Поильник Philips AVENT',
    description: 'Поильник с трубочкой, непроливайка, 12+ месяцев',
    url: 'https://www.wildberries.ru/catalog/4886956/detail.aspx?size=17910173',
    image: '/gifts/cup.svg',
    accent: 'peach',
  },
  {
    id: 'busyboard',
    name: 'Бизиборд 8 в 1',
    description: 'Развивающая игрушка ATIN',
    url: 'https://www.wildberries.ru/catalog/844741002/detail.aspx?size=1269453738',
    image: '/gifts/busyboard.svg',
    accent: 'yellow',
  },
  {
    id: 'play-mat',
    name: 'Коврик-пазл',
    description: 'Развивающий коврик для ползания',
    url: 'https://www.wildberries.ru/catalog/444063324/detail.aspx?size=628229663',
    image: '/gifts/mat.svg',
    accent: 'blue',
  },
  {
    id: 'creative-garden',
    name: 'Детский трёхколесный велосипед с ручкой Junion Belli',
    description: 'Творческий набор с Яндекс Маркета',
    url: 'https://market.yandex.ru/cc/BNTQAA',
    image: 'https://cdn-icons-png.flaticon.com/512/4213/4213958.png',
    accent: 'lilac',
  },
];
