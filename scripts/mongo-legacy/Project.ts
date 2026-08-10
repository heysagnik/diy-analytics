import mongoose, { type Query, Schema } from 'mongoose';
import { normalizeProjectUrl } from '@/utils/url';

export function extractDomain(url: string): string | undefined {
  return normalizeProjectUrl(url)?.domain;
}

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
    url: { type: String, required: true, trim: true },
    domain: { type: String, required: false, trim: true, index: true },
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `site_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`,
    },
    publicMode: { type: Boolean, default: false },
    // Reporting timezone (IANA name, e.g. "Asia/Kolkata"). Unset (null)
    // means "use each viewer's own browser timezone" — see
    // AnalyticsService.getAnalytics, which only overrides with this when set.
    timezone: { type: String, default: null },
    excludedIPs: { type: [String], default: [] },
    excludedPaths: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

interface DomainDocument {
  url?: string;
  domain?: string | null;
  get?: (path: string) => unknown;
  set?: (path: string, value: string) => void;
}

function deriveDomain(this: DomainDocument) {
  const value = this.get ? this.get('url') : this.url;
  const url = typeof value === 'string' ? value : undefined;
  if (url) {
    const domain = extractDomain(url);
    if (domain) {
      if (this.set) this.set('domain', domain);
      else this.domain = domain;
    }
  }
}

ProjectSchema.pre('save', function () {
  deriveDomain.call(this);
});

ProjectSchema.pre('findOneAndUpdate', function () {
  const update = (this as Query<unknown, unknown>).getUpdate() as {
    url?: string;
    $set?: { url?: string };
  } | null;
  if (update && (update.url || update.$set?.url)) {
    const url = update.url ?? update.$set?.url;
    if (!url) return;
    const domain = extractDomain(url);
    if (domain) {
      this.set('domain', domain);
    }
  }
});

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
