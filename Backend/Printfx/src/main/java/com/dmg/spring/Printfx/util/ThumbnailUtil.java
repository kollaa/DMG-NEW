package com.dmg.spring.Printfx.util;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Iterator;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

/**
 * Turns a large "data:image/...;base64,..." preview into a small JPEG
 * (max 500 px wide), typically 30-60 KB instead of 500 KB+.
 * If anything goes wrong, the original image is returned unchanged.
 */
public final class ThumbnailUtil {

    private static final int MAX_WIDTH = 500;
    private static final float JPEG_QUALITY = 0.75f;
    private static final int ALREADY_SMALL_CHARS = 120_000; // ~90 KB

    private ThumbnailUtil() {
    }

    public static String shrink(String dataUrl) {
        if (dataUrl == null || !dataUrl.startsWith("data:image/")) {
            return dataUrl;
        }
        if (dataUrl.length() <= ALREADY_SMALL_CHARS) {
            return dataUrl; // already small enough, don't re-compress
        }

        try {
            int comma = dataUrl.indexOf(',');
            if (comma < 0) {
                return dataUrl;
            }
            byte[] bytes = Base64.getDecoder().decode(dataUrl.substring(comma + 1));
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(bytes));
            if (source == null) {
                return dataUrl;
            }

            double scale = Math.min(1.0, (double) MAX_WIDTH / source.getWidth());
            int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
            int height = Math.max(1, (int) Math.round(source.getHeight() * scale));

            BufferedImage small = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = small.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setColor(Color.WHITE); // JPEG has no transparency
            g.fillRect(0, 0, width, height);
            g.drawImage(source, 0, 0, width, height, null);
            g.dispose();

            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
            if (!writers.hasNext()) {
                return dataUrl;
            }
            ImageWriter writer = writers.next();
            ImageWriteParam params = writer.getDefaultWriteParam();
            params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            params.setCompressionQuality(JPEG_QUALITY);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
                writer.setOutput(ios);
                writer.write(null, new IIOImage(small, null, null), params);
            } finally {
                writer.dispose();
            }

            String result = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
            return result.length() < dataUrl.length() ? result : dataUrl;
        } catch (Exception e) {
            return dataUrl; // never block saving an order because of a preview
        }
    }
}