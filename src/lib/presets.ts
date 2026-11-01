// Every tool page on the site is one entry in this list.
// The engine is the same everywhere; a preset only changes the starting settings
// and the written guidance around the tool. Add a page by adding an entry.
import type { ToolDefaults } from './engine';

export type GroupId = 'size' | 'type' | 'convert' | 'resize';

export interface Preset {
  slug: string;
  group: GroupId;
  /** Short label used in link lists. */
  nav: string;
  /** <title> tag. */
  title: string;
  h1: string;
  /** Meta description. */
  description: string;
  /** Paragraph under the heading. */
  lead: string;
  defaults: ToolDefaults;
  sections: { heading: string; body: string[] }[];
  faq: { q: string; a: string }[];
}

export const groups: { id: GroupId; label: string }[] = [
  { id: 'size', label: 'Compress to a size' },
  { id: 'type', label: 'Compress by format' },
  { id: 'convert', label: 'Convert formats' },
  { id: 'resize', label: 'Resize and forms' },
];

/** Shown at the bottom of every tool page. */
export const sharedFaq = {
  q: 'Is my image uploaded anywhere?',
  a: 'No. The work happens inside your browser, on your own device. The file is never sent to a server, which is also why the tool keeps working on a slow connection once the page has loaded.',
};

const ANY = 'image/*,.heic,.heif';

const base: ToolDefaults = {
  format: 'original',
  targetKB: null,
  quality: 80,
  width: null,
  height: null,
  keepAspect: true,
  accept: ANY,
};

// Size pages keep the original format by default. A PNG that cannot reach the
// limit is switched to JPG automatically by the engine.
const size = (kb: number, extra: Partial<ToolDefaults> = {}): ToolDefaults => ({
  ...base,
  targetKB: kb,
  ...extra,
});

export const presets: Preset[] = [
  // ---------------------------------------------------------------- sizes
  {
    slug: 'compress-image-to-20kb',
    group: 'size',
    nav: 'Compress image to 20KB',
    title: 'Compress Image to 20KB Online, Free and Private',
    h1: 'Compress image to 20KB',
    description:
      'Reduce a photo or scan to under 20KB in your browser. Free, no upload, no signup. Works with JPG, PNG, WebP and HEIC.',
    lead: 'Drop your image and get a file under 20KB. Everything happens on your device, so the photo is never uploaded.',
    defaults: size(20),
    sections: [
      {
        heading: 'When 20KB is the limit',
        body: [
          'A 20KB cap usually appears on forms that ask for a signature or a small stamp-size picture. It is a tight budget: a typical phone photo is a hundred times larger. The tool lowers the JPG quality as far as it needs to, and if that is not enough it also reduces the pixel dimensions until the file fits.',
          'Requirements differ from one form to the next, so read the instructions on yours. If it states a pixel size as well, enter it in the resize fields and the tool will aim for both.',
        ],
      },
      {
        heading: 'Getting a clean result at this size',
        body: [
          'Crop away empty space before you start, because fewer pixels means less data. Plain backgrounds compress far better than busy ones. For a signature, use dark ink on white paper and photograph it in even light, without shadows.',
        ],
      },
    ],
    faq: [
      {
        q: 'Will 20KB look blurry?',
        a: 'A full photo at 20KB loses a lot of detail. Small images such as signatures, logos and stamp-size portraits hold up well. For a larger photo, reduce the pixel size first so the quality setting has less to remove.',
      },
      {
        q: 'It says it could not reach 20KB. What now?',
        a: 'Very detailed images can stay above the limit even at the lowest quality. Enter a smaller width or height, for example 300 pixels wide, and the tool will try again.',
      },
    ],
  },
  {
    slug: 'compress-image-to-50kb',
    group: 'size',
    nav: 'Compress image to 50KB',
    title: 'Compress Image to 50KB Online, Free and Private',
    h1: 'Compress image to 50KB',
    description:
      'Shrink a photo to under 50KB without uploading it. Free image compressor for form photos and profile pictures.',
    lead: 'Get a photo down to 50KB or less. The best quality that fits under the limit is chosen for you.',
    defaults: size(50),
    sections: [
      {
        heading: 'Where a 50KB limit comes from',
        body: [
          'Many online forms and portals ask for a profile or ID-style photo of 50KB or less. A portrait that size is a small image, a few hundred pixels wide, so the trick is to give the tool a sensible starting point.',
        ],
      },
      {
        heading: 'How to hit 50KB without ruining the photo',
        body: [
          'Set the pixel dimensions the form asks for first, then let the tool compress. A portrait that is 300 pixels wide usually fits under 50KB at good quality. A 3000 pixel original has to be squeezed much harder to get there, and the result looks worse.',
          'If the form wants an exact size such as 200 by 230 pixels, untick Keep aspect ratio so both numbers are used exactly. Crop the photo to the right shape first, because the tool resizes but does not crop.',
        ],
      },
    ],
    faq: [
      {
        q: 'Which format should I use?',
        a: 'JPG reaches small sizes with less visible damage than PNG. By default the tool keeps your original format, and if a PNG cannot get under the limit it switches to JPG for you. Set Save as to JPG yourself if you want JPG every time.',
      },
      {
        q: 'What happens to a PNG with a transparent background?',
        a: 'The tool first tries to shrink the PNG by reducing its colors, which keeps transparency. If that is not enough, it saves a JPG instead, and transparent areas become white.',
      },
    ],
  },
  {
    slug: 'compress-image-to-100kb',
    group: 'size',
    nav: 'Compress image to 100KB',
    title: 'Compress Image to 100KB Online, Free and Private',
    h1: 'Compress image to 100KB',
    description:
      'Compress JPG, PNG or WebP images to under 100KB in your browser. No upload, no signup, no watermark.',
    lead: 'Make an image 100KB or smaller while keeping it as sharp as the limit allows.',
    defaults: size(100),
    sections: [
      {
        heading: 'Documents, ID scans and photos',
        body: [
          'A 100KB limit is common for scanned proofs, ID documents and photos on application portals. Text-heavy scans compress well, because most of the page is plain white paper.',
        ],
      },
      {
        heading: 'Tips for scans',
        body: [
          'A scan at 150 to 200 dpi is enough for almost every upload. Higher resolution only makes the file bigger. A grayscale scan is smaller than a color one, so if your document is black text on white paper, scan it in grayscale.',
          'After compressing, download the file and zoom in to check that small print is still readable before you submit it.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I compress a scanned PDF here?',
        a: 'Not directly. This tool works on image files. Export the pages as JPG or PNG, compress them here, and combine them again if the portal needs a PDF.',
      },
      {
        q: 'Will the text stay readable?',
        a: 'For a single-page scan made at 150 dpi or more, usually yes. If a page is dense, try a slightly higher limit or a larger width so the letters keep their shape.',
      },
    ],
  },
  {
    slug: 'compress-image-to-200kb',
    group: 'size',
    nav: 'Compress image to 200KB',
    title: 'Compress Image to 200KB Online, Free and Private',
    h1: 'Compress image to 200KB',
    description:
      'Reduce any image to 200KB or less in seconds. Private, in-browser compression for certificates, scans and photos.',
    lead: 'Shrink an image to 200KB or under, right on your device.',
    defaults: size(200),
    sections: [
      {
        heading: 'Certificates, marksheets and full-page scans',
        body: [
          'A 200KB limit leaves room for a clear full-page scan or a decent photo. It is a common ceiling for certificates and marksheets uploaded to portals, and for pictures attached to online applications.',
        ],
      },
      {
        heading: 'How close to 200KB will it get?',
        body: [
          'The tool searches for the highest quality that still fits under the limit, so the result lands as close to 200KB as it can without going over. If your file is already smaller than the limit and you have not asked for a different format or size, the original is returned untouched instead of being compressed again.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is 200KB enough for a full-page scan?',
        a: 'Usually, as a JPG at around 150 dpi. Color scans with photos or stamps need more room, so the tool lowers quality only as much as it has to.',
      },
      {
        q: 'Why is the result smaller than 200KB?',
        a: 'It stops at the best quality that fits. A simple image can already look its best at well under the limit, and making it bigger would add nothing. A file that already fits is returned as it is.',
      },
    ],
  },
  {
    slug: 'compress-image-to-500kb',
    group: 'size',
    nav: 'Compress image to 500KB',
    title: 'Compress Image to 500KB Online, Free and Private',
    h1: 'Compress image to 500KB',
    description:
      'Get any image under 500KB with minimal quality loss. Free browser-based compressor for web and product photos.',
    lead: 'Bring a big photo down to 500KB or less with very little visible change.',
    defaults: size(500),
    sections: [
      {
        heading: 'Product photos, blog images and uploads',
        body: [
          'Around 500KB is a good balance for images on a website or marketplace listing. It is small enough to load quickly on a phone and large enough to keep detail.',
        ],
      },
      {
        heading: 'Dimensions that pair well with 500KB',
        body: [
          'For most web uses, 1200 to 1600 pixels on the long side is plenty. Larger images mostly add file size that nobody can see. Enter a width in the resize box to cap the dimensions, and the compressor needs to cut less quality to fit.',
        ],
      },
    ],
    faq: [
      {
        q: 'Should I choose WebP for a website?',
        a: 'WebP is often noticeably smaller than JPG at the same visual quality, and all current major browsers display it. Set Save as to WebP if your site or platform accepts it.',
      },
      {
        q: 'Will I see a difference after compressing?',
        a: 'At 500KB, a normal photo should look the same at normal viewing size. Zoomed in to 100% you may spot softer fine detail.',
      },
    ],
  },
  {
    slug: 'compress-image-to-1mb',
    group: 'size',
    nav: 'Compress image to 1MB',
    title: 'Compress Image to 1MB Online, Free and Private',
    h1: 'Compress image to 1MB',
    description:
      'Reduce a large photo to under 1MB for email and uploads. Runs in your browser, nothing is sent anywhere.',
    lead: 'Make a large photo fit under 1MB for email and upload forms.',
    defaults: size(1024),
    sections: [
      {
        heading: 'Email attachments and upload forms',
        body: [
          'Some email setups and web forms limit attachments to 1MB. Phone photos are often between 3 and 8MB, so a few of them can blow past a limit quickly. Compressing each one before you attach it is faster than being asked to try again.',
        ],
      },
      {
        heading: 'Keeping photos good-looking at 1MB',
        body: [
          'Most phone photos can reach 1MB with little visible change at normal viewing size, because the original contains far more pixels than a screen can show. Drop several at once and download them together as a ZIP.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is 1MB the same as 1024KB?',
        a: 'Yes. This tool counts 1MB as 1024KB, which is how most upload limits are measured.',
      },
      {
        q: 'Can I compress many photos at once?',
        a: 'Yes. Drop as many as you like. Each one is compressed on its own and you can download them all as a single ZIP file.',
      },
    ],
  },

  // ---------------------------------------------------------- by format
  {
    slug: 'compress-jpg',
    group: 'type',
    nav: 'Compress JPG',
    title: 'Compress JPG Images Online, Free and Private',
    h1: 'Compress JPG images',
    description:
      'Make JPG and JPEG files smaller without a visible drop in quality. Private, in-browser compression with no upload.',
    lead: 'Shrink JPG photos with a quality slider and see the saving straight away.',
    defaults: { ...base, format: 'jpeg', quality: 75 },
    sections: [
      {
        heading: 'How JPG compression works',
        body: [
          'JPG is a lossy format. It discards detail that the eye barely notices, and the quality setting decides how much. For photographs, a setting around 70 to 80 percent usually cuts the file size by more than half with no obvious change.',
          'Each time a JPG is saved again, it loses a little more. Compress from your original photo when you can, rather than from a copy that has already been compressed.',
        ],
      },
      {
        heading: 'Choosing a quality',
        body: [
          'Use 80 percent for general sharing, 60 for thumbnails and previews, and 90 or higher when the picture will be printed or edited further. Below 50 percent, blocky patches start to show around edges and in smooth skies.',
        ],
      },
    ],
    faq: [
      {
        q: 'Does this remove location and camera data?',
        a: 'Saving through the browser drops metadata such as GPS location and camera details. The exception is when your file is already as small as it can get: then the original is kept, and its metadata stays with it.',
      },
      {
        q: 'Why did my JPG not get smaller?',
        a: 'Some files are already compressed hard, for example images saved from messaging apps. Re-encoding them can make them larger, so the tool keeps your original in that case.',
      },
    ],
  },
  {
    slug: 'compress-png',
    group: 'type',
    nav: 'Compress PNG',
    title: 'Compress PNG Images Online, Free and Private',
    h1: 'Compress PNG images',
    description:
      'Reduce PNG file size by trimming the color palette. Keeps transparency. Free, private, runs in your browser.',
    lead: 'Make PNG files smaller while keeping transparency.',
    defaults: { ...base, format: 'png', quality: 80 },
    sections: [
      {
        heading: 'Why PNG files get so big',
        body: [
          'PNG stores every pixel exactly, which is perfect for logos, screenshots and diagrams, and expensive for anything photographic. A screenshot of a phone can be several megabytes for that reason.',
        ],
      },
      {
        heading: 'How the compression works here',
        body: [
          'The tool reduces the number of distinct colors in the image, which can shrink a PNG a lot while looking almost the same on graphics and interface screenshots. The quality slider controls how many colors are kept. At 100 percent nothing is removed and the file is only re-packed more efficiently.',
          'Transparent areas stay transparent. If the picture is a photograph, saving it as JPG or WebP will make it far smaller than any PNG can be.',
        ],
      },
    ],
    faq: [
      {
        q: 'Will I notice the lower color count?',
        a: 'On flat graphics, rarely. On gradients and photographs you may see banding at low quality settings. Raise the slider if the result looks rough.',
      },
      {
        q: 'When should I use JPG or WebP instead?',
        a: 'For photographs. They are lossy formats built for that kind of image and usually produce files several times smaller than PNG. Keep PNG for logos, text and anything that needs transparency.',
      },
    ],
  },

  // ------------------------------------------------------------ convert
  {
    slug: 'png-to-jpg',
    group: 'convert',
    nav: 'PNG to JPG',
    title: 'Convert PNG to JPG Online, Free and Private',
    h1: 'Convert PNG to JPG',
    description:
      'Convert PNG images to JPG in your browser. No upload, no watermark, batch conversion with ZIP download.',
    lead: 'Turn PNG files into smaller JPG files in one step.',
    defaults: { ...base, format: 'jpeg', quality: 90 },
    sections: [
      {
        heading: 'What happens to transparency',
        body: [
          'JPG cannot store transparent pixels. Any transparent area in your PNG is filled with white, so a logo on a see-through background will appear on a white one. If you need to keep transparency, convert to WebP instead.',
        ],
      },
      {
        heading: 'When converting makes sense',
        body: [
          'Photographs saved as PNG are much larger than they need to be, and converting them to JPG often cuts the size by 80 percent or more. Screenshots with sharp text are different: JPG can leave faint fuzz around letters, so use a high quality setting, such as 95, for those.',
        ],
      },
    ],
    faq: [
      {
        q: 'Will quality drop?',
        a: 'JPG is lossy, but at 90 percent the difference is hard to see on photographs. Lower the slider for a smaller file or raise it for sharper edges.',
      },
      {
        q: 'Can I convert many files at once?',
        a: 'Yes. Drop them all in together and use Download all as ZIP when they finish.',
      },
    ],
  },
  {
    slug: 'jpg-to-png',
    group: 'convert',
    nav: 'JPG to PNG',
    title: 'Convert JPG to PNG Online, Free and Private',
    h1: 'Convert JPG to PNG',
    description:
      'Convert JPG and JPEG files to PNG in your browser. Private, free and fast, with batch download.',
    lead: 'Save JPG photos as PNG files for software and forms that ask for PNG.',
    defaults: { ...base, format: 'png', quality: 100 },
    sections: [
      {
        heading: 'What JPG to PNG does and does not do',
        body: [
          'Converting changes the file type, not the picture. A JPG has already lost some detail, and saving it as PNG keeps what is left without making it sharper. The file will usually be larger, sometimes several times larger.',
        ],
      },
      {
        heading: 'Why people still do it',
        body: [
          'Some design tools, forms and print services require PNG. PNG is also a safe format to edit in, because saving it again never reduces quality the way saving a JPG again does.',
        ],
      },
    ],
    faq: [
      {
        q: 'Why is my PNG bigger than the JPG?',
        a: 'PNG stores pixels exactly, while JPG throws detail away to stay small. Lower the quality slider to cut the file size by reducing the number of colors, or go back to JPG if you do not need PNG.',
      },
      {
        q: 'Will the converted image look better?',
        a: 'No. Conversion cannot restore detail that the JPG already lost. It only changes how the picture is stored.',
      },
    ],
  },
  {
    slug: 'webp-to-png',
    group: 'convert',
    nav: 'WebP to PNG',
    title: 'Convert WebP to PNG Online, Free and Private',
    h1: 'Convert WebP to PNG',
    description:
      'Turn WebP images into PNG files with transparency kept. Runs in your browser with no upload.',
    lead: 'Convert WebP images to PNG so any app or form can open them.',
    defaults: { ...base, format: 'png', quality: 100 },
    sections: [
      {
        heading: 'Why WebP files sometimes will not open',
        body: [
          'WebP is common on the web, but older software, some email clients and many upload forms still do not accept it. Saving the image as PNG gives you a format that nearly everything can read.',
        ],
      },
      {
        heading: 'Transparency is kept',
        body: [
          'PNG supports transparent backgrounds, so a WebP logo with a see-through background stays see-through after conversion. The PNG is usually larger than the WebP it came from.',
        ],
      },
    ],
    faq: [
      {
        q: 'Does the conversion lose quality?',
        a: 'Not from the PNG side. At 100 percent, every pixel of the WebP is kept as it is.',
      },
      {
        q: 'What if I need a smaller file?',
        a: 'Convert to JPG for photographs instead. It produces much smaller files, though without transparency.',
      },
    ],
  },
  {
    slug: 'webp-to-jpg',
    group: 'convert',
    nav: 'WebP to JPG',
    title: 'Convert WebP to JPG Online, Free and Private',
    h1: 'Convert WebP to JPG',
    description:
      'Convert WebP images to JPG in your browser. Fast, free, private, with batch ZIP download.',
    lead: 'Save WebP images as ordinary JPG files that open anywhere.',
    defaults: { ...base, format: 'jpeg', quality: 90 },
    sections: [
      {
        heading: 'When JPG is the safer choice',
        body: [
          'If you saved an image from a website and it arrives as WebP, JPG is the format that every phone, printer and form accepts. This tool converts it without sending the file anywhere.',
        ],
      },
      {
        heading: 'Transparent WebP files',
        body: [
          'JPG has no transparency, so see-through areas become white. If you need to keep a transparent background, convert to PNG instead.',
        ],
      },
    ],
    faq: [
      {
        q: 'Will the file get bigger?',
        a: 'Often, yes. WebP is efficient, and the same picture saved as JPG at similar quality is usually a bit larger. Lower the quality slider if size matters more than detail.',
      },
      {
        q: 'Are animated WebP files supported?',
        a: 'Only the first frame is converted. The result is a still image.',
      },
    ],
  },
  {
    slug: 'jpg-to-webp',
    group: 'convert',
    nav: 'JPG to WebP',
    title: 'Convert JPG to WebP Online, Free and Private',
    h1: 'Convert JPG to WebP',
    description:
      'Convert JPG images to WebP for smaller files and faster websites. No upload, runs in your browser.',
    lead: 'Convert JPG photos to WebP and save space without a visible difference.',
    defaults: { ...base, format: 'webp', quality: 80 },
    sections: [
      {
        heading: 'Why WebP is worth using on a website',
        body: [
          'At the same visual quality, a WebP file is commonly around a quarter to a third smaller than the JPG it replaces. On a page with many photos, that adds up to noticeably faster loading, which helps visitors on slow mobile connections.',
        ],
      },
      {
        heading: 'Browser and form support',
        body: [
          'All current major browsers display WebP. Some older apps and upload forms still reject it, so keep the JPG if you are not sure where the image will end up.',
        ],
      },
    ],
    faq: [
      {
        q: 'Which quality should I pick?',
        a: 'Start at 80 percent. If the result still looks identical to the original on your screen, try 70 for an even smaller file.',
      },
      {
        q: 'Can I upload WebP to any website?',
        a: 'Not always. Many platforms accept it, but some forms and older tools only take JPG or PNG. Check before you replace the originals.',
      },
    ],
  },
  {
    slug: 'png-to-webp',
    group: 'convert',
    nav: 'PNG to WebP',
    title: 'Convert PNG to WebP Online, Free and Private',
    h1: 'Convert PNG to WebP',
    description:
      'Convert PNG to WebP and keep transparency, with much smaller files. Free and private in-browser conversion.',
    lead: 'Convert PNG images to WebP for far smaller files, transparency included.',
    defaults: { ...base, format: 'webp', quality: 85 },
    sections: [
      {
        heading: 'Smaller than PNG, still transparent',
        body: [
          'WebP supports transparent backgrounds like PNG does, and its files are often much smaller. That makes it a good fit for logos, icons and cut-out product photos on a website.',
        ],
      },
      {
        heading: 'Screenshots and sharp text',
        body: [
          'WebP at a high quality setting handles screenshots well. If edges look soft, raise the quality to 90 or higher. If it still bothers you, keep that image as PNG.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is the conversion lossless?',
        a: 'This tool saves lossy WebP, tuned by the quality slider. At 90 percent or more, differences are very hard to spot.',
      },
      {
        q: 'Will older software open the result?',
        a: 'Modern browsers will. Some older programs will not, so keep the PNG as well if you need to open it in older software.',
      },
    ],
  },
  {
    slug: 'heic-to-jpg',
    group: 'convert',
    nav: 'HEIC to JPG',
    title: 'Convert HEIC to JPG Online, Free and Private',
    h1: 'Convert HEIC to JPG',
    description:
      'Convert iPhone HEIC photos to JPG in your browser. No upload, no signup, batch conversion with ZIP download.',
    lead: 'Turn iPhone HEIC photos into JPG files that open on any phone, laptop or form.',
    defaults: { ...base, format: 'jpeg', quality: 90, accept: 'image/heic,image/heif,.heic,.heif' },
    sections: [
      {
        heading: 'Why your photos are HEIC',
        body: [
          'iPhones save photos as HEIC by default, because the format stores the same picture in a smaller file. The trouble is that many websites, Windows apps and upload forms cannot open it. Converting to JPG fixes that.',
          'To make your iPhone save JPG from now on, open Settings, then Camera, then Formats, and choose Most Compatible.',
        ],
      },
      {
        heading: 'Private and a little slower the first time',
        body: [
          'The conversion runs on your device, so your photos stay with you. The first HEIC file takes a few seconds longer, because the decoder is loaded at that moment. After that, files go through quicker.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I convert many HEIC photos together?',
        a: 'Yes. Large batches use a lot of memory, so on a phone it is best to do 10 to 20 at a time.',
      },
      {
        q: 'My photo does not show a preview. Is something wrong?',
        a: 'No. Browsers cannot display HEIC, so the preview appears only after the conversion finishes.',
      },
    ],
  },

  // ------------------------------------------------------ resize / forms
  {
    slug: 'resize-image',
    group: 'resize',
    nav: 'Resize image',
    title: 'Resize Image Online by Pixels, Free and Private',
    h1: 'Resize image',
    description:
      'Resize images to exact pixel dimensions in your browser. Keep the aspect ratio or set a custom size. No upload.',
    lead: 'Set a width and height in pixels and download the resized image.',
    defaults: { ...base, width: 1280, height: null, keepAspect: true },
    sections: [
      {
        heading: 'Resize by width, height, or both',
        body: [
          'Fill in just a width and the height follows automatically, so the picture is not squashed. Fill in both with Keep aspect ratio ticked and the image is fitted inside that box. Untick it to force the exact size you typed.',
          'This tool resizes but does not crop. If the shape of the picture needs to change, crop it first in your phone or computer photo editor.',
        ],
      },
      {
        heading: 'Making an image bigger',
        body: [
          'Enlarging adds pixels but not detail, so a small image will look soft when scaled up. Resizing down always gives better results than resizing up.',
        ],
      },
    ],
    faq: [
      {
        q: 'How do I get an exact size such as 800 by 600?',
        a: 'Enter 800 and 600, then untick Keep aspect ratio. If the original has a different shape, it will stretch, so crop it to the same ratio first.',
      },
      {
        q: 'Does resizing also reduce file size?',
        a: 'Yes, usually by a lot. Halving the width and height leaves a quarter of the pixels. You can also set a target size in the same tool.',
      },
    ],
  },
  {
    slug: 'photo-for-online-form',
    group: 'resize',
    nav: 'Photo for online forms',
    title: 'Resize Photo for Online Forms: 200x230 Pixels, Under 50KB',
    h1: 'Resize a photo for an online form',
    description:
      'Resize a passport-style photo to 200x230 pixels under 50KB for online application forms. Private, free, no upload.',
    lead: 'Starts at 200 by 230 pixels and under 50KB, a pattern many application forms use. Change the numbers to match yours.',
    defaults: size(50, { format: 'jpeg', width: 200, height: 230, keepAspect: false }),
    sections: [
      {
        heading: 'Check your form first',
        body: [
          'Every form sets its own rules for the photo: pixel size, file size and format. The numbers here are a common starting point, not a promise that they match yours. Read the instruction on the upload page and change the width, height and target size to suit.',
        ],
      },
      {
        heading: 'Steps that give a good result',
        body: [
          'Crop the photo so your face fills the frame in the shape the form expects, then drop it in. With Keep aspect ratio off, the tool uses your exact width and height, so a photo of the wrong shape will look stretched. Cropping first avoids that.',
          'Use a plain, light background and even lighting. Both help the picture compress well and look clean at a small size.',
        ],
      },
    ],
    faq: [
      {
        q: 'My photo looks stretched. Why?',
        a: 'The tool forces the exact size you entered when Keep aspect ratio is off. Crop the photo to the right shape before resizing, or tick Keep aspect ratio and accept that one side may come out smaller.',
      },
      {
        q: 'Can I use a different size?',
        a: 'Yes. Change the width, height and target size to whatever your form asks for. The page keeps your values until you reload.',
      },
    ],
  },
  {
    slug: 'signature-for-online-form',
    group: 'resize',
    nav: 'Signature for online forms',
    title: 'Resize Signature for Online Forms: 140x60 Pixels, Under 20KB',
    h1: 'Resize a signature for an online form',
    description:
      'Resize a signature image to 140x60 pixels under 20KB for online forms. Free, private, runs in your browser.',
    lead: 'Starts at 140 by 60 pixels and under 20KB, a pattern many application forms use. Adjust it to match your form.',
    defaults: size(20, { format: 'jpeg', width: 140, height: 60, keepAspect: false }),
    sections: [
      {
        heading: 'Check the numbers your form asks for',
        body: [
          'Forms set their own signature rules, and they vary. Treat the starting values as a common example, then change the width, height and size limit to match the instructions on your upload page.',
        ],
      },
      {
        heading: 'How to prepare the signature',
        body: [
          'Sign with a dark pen on plain white paper. Photograph it in even light without shadows, or scan it. Crop tightly around the signature before you drop it in, because the tool resizes the whole image and does not crop.',
          'A tightly cropped signature has the same shape as the box the form expects, so it fills the space and stays readable at 140 pixels wide.',
        ],
      },
    ],
    faq: [
      {
        q: 'My signature looks squashed or faint.',
        a: 'Crop closer to the signature so its shape matches the target box. Use a darker pen, and make sure the paper is evenly lit when you photograph it.',
      },
      {
        q: 'Which format is best?',
        a: 'JPG, in most cases. It reaches very small file sizes, and this page saves JPG by default.',
      },
    ],
  },
];

export const bySlug = (slug: string) => presets.find((p) => p.slug === slug);
