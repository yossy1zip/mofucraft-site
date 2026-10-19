export interface MenuItem {
  title: string;
  slug: string;
  image: string;
  icon?: string;
  isFolder?: boolean;
  items?: MenuItem[];
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}
