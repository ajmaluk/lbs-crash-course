interface JsonLdProps {
    data: Record<string, unknown>;
    id: string;
}

/**
 * A reusable component for rendering JSON-LD structured data.
 * Keeps scripts organized and avoids duplication.
 */
export default function JsonLd({ data, id }: JsonLdProps) {
    return (
        <script
            id={id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data),
            }}
        />
    );
}

/**
 * Predefined schema generators for the LBS MCA Platform
 * Hardened for strict SEO compliance.
 */
export const schemas = {
    educationalOrganization: (baseUrl: string) => ({
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "name": "LBS MCA Entrance Platform by Infronixis",
        "image": `${baseUrl}/og-image.png`,
        "@id": baseUrl,
        "url": baseUrl,
        "telephone": "+917012823414",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Kannur",
            "addressLocality": "Kannur",
            "addressRegion": "Kerala",
            "postalCode": "670001",
            "addressCountry": "IN"
        },
        "areaServed": [
            { "@type": "State", "name": "Kerala" },
            { "@type": "State", "name": "Tamil Nadu" },
            { "@type": "Country", "name": "India" }
        ],
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 11.8745,
            "longitude": 75.3704
        },
        "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "00:00",
            "closes": "23:59"
        }
    }),
    organization: (baseUrl: string) => ({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "LBS MCA Entrance Platform by Infronixis",
        "alternateName": "LBS MCA",
        "url": baseUrl,
        "description": "Premier online learning platform for LBS MCA Entrance Examination preparation.",
        "logo": `${baseUrl}/icon.png`,
        "brand": {
            "@type": "Brand",
            "name": "LBS MCA Entrance"
        },
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+917012823414",
            "contactType": "customer service",
            "email": "cetmca2025@gmail.com",
            "availableLanguage": ["English", "Malayalam"]
        }
    }),
    webSite: (baseUrl: string) => ({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "LBS MCA Entrance Official Platform",
        "url": baseUrl
    }),
    course: (baseUrl: string) => ({
        "@context": "https://schema.org",
        "@type": "Course",
        "name": "LBS MCA Entrance 2026 Official Crash Course",
        "description": "Premium online preparation course for Kerala LBS MCA Entrance 2026. Expert mentorship for students from Kerala, Tamil Nadu, and beyond. Includes live sessions, recorded library, and national ranking mock tests.",
        "provider": {
            "@type": "Organization",
            "name": "LBS MCA Entrance Platform by Infronixis",
            "sameAs": baseUrl
        },
        "courseCode": "LBS-MCA-2026",
        "hasCourseInstance": {
            "@type": "CourseInstance",
            "courseMode": "online",
            "courseWorkload": "PT120H",
            "instructor": {
                "@type": "Person",
                "name": "Expert MCA Mentors"
            }
        }
    }),
    article: (baseUrl: string, post: { title: string; excerpt: string; date: string; slug: string; keywords: string[] }) => ({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.excerpt,
        "datePublished": new Date(post.date).toISOString(),
        "author": {
            "@type": "Person",
            "name": "ASCA",
            "url": `${baseUrl}/blog`
        },
        "publisher": {
            "@type": "Organization",
            "name": "LBS MCA Entrance Platform by Infronixis",
            "logo": {
                "@type": "ImageObject",
                "url": `${baseUrl}/icon.png`
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${baseUrl}/blog/${post.slug}`
        },
        "keywords": post.keywords.join(", ")
    }),
    breadcrumb: (baseUrl: string, items: { name: string; path: string }[]) => ({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.path.startsWith("http") ? item.path : `${baseUrl}${item.path}`
        }))
    }),
    video: (baseUrl: string, video: { name: string; description: string; thumbnailUrl: string[]; uploadDate: string; contentUrl: string; embedUrl: string }) => ({
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": video.name,
        "description": video.description,
        "thumbnailUrl": video.thumbnailUrl,
        "uploadDate": video.uploadDate,
        "contentUrl": video.contentUrl,
        "embedUrl": video.embedUrl
    }),
    contactPage: (baseUrl: string) => ({
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": "LBS MCA 2026 Help & Support",
        "description": "Direct contact channels for LBS MCA Entrance coaching, mock tests, and billing support.",
        "url": `${baseUrl}/contact`,
        "mainEntity": {
            "@type": "EducationalOrganization",
            "name": "LBS MCA Entrance Platform by Infronixis",
            "telephone": "+917012823414",
            "email": "cetmca2025@gmail.com",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "Kannur",
                "addressLocality": "Kannur",
                "addressRegion": "Kerala",
                "postalCode": "670001",
                "addressCountry": "IN"
            }
        }
    }),
    faq: (questions: { question: string; answer: string }[]) => ({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": questions.map((q) => ({
            "@type": "Question",
            "name": q.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": q.answer
            }
        }))
    })
};
