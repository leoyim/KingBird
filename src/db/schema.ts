import Dexie, { type Table } from 'dexie';
import type { Feed, Subscription, Article, ArticleReadState, Tag, ArticleTag, Folder, UserPreferences, FilterRule } from '@/types';
import { DEFAULT_PREFERENCES } from '@/types';

export class EZRSSDatabase extends Dexie {
  feeds!: Table<Feed, string>;
  subscriptions!: Table<Subscription, string>;
  articles!: Table<Article, string>;
  readStates!: Table<ArticleReadState, string>;
  tags!: Table<Tag, string>;
  articleTags!: Table<ArticleTag, [string, string]>;
  folders!: Table<Folder, string>;
  preferences!: Table<UserPreferences, string>;
  filterRules!: Table<FilterRule, string>;

  constructor() {
    super('EZRSS');

    this.version(2).stores({
      feeds: 'id, url',
      subscriptions: 'id, feedId, folderId, sortOrder',
      articles: 'id, feedId, link, publishedAt, [feedId+link], [feedId+publishedAt]',
      readStates: 'articleId, isRead, isStarred',
      tags: 'id, name',
      articleTags: '[articleId+tagId], articleId, tagId',
      folders: 'id, parentId, sortOrder',
      preferences: 'id',
      filterRules: 'id, keyword, isActive',
    });

    this.feeds = this.table('feeds');
    this.subscriptions = this.table('subscriptions');
    this.articles = this.table('articles');
    this.readStates = this.table('readStates');
    this.tags = this.table('tags');
    this.articleTags = this.table('articleTags');
    this.folders = this.table('folders');
    this.preferences = this.table('preferences');
    this.filterRules = this.table('filterRules');
  }

  async ensureDefaultPreferences(): Promise<UserPreferences> {
    const prefs = await this.preferences.get('default');
    if (!prefs) {
      await this.preferences.put(DEFAULT_PREFERENCES);
      return DEFAULT_PREFERENCES;
    }
    return prefs;
  }
}

export const db = new EZRSSDatabase();
