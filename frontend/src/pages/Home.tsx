import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 text-center max-w-lg"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-gold-500/20 bg-gold-500/10">
          <Globe2 size={40} className="text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground">MUN Gridixia</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Premium conference operations platform for Model United Nations and Youth Parliament events.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/command-center')}>
            Command Center
            <ArrowRight size={14} />
          </Button>
          <Button variant="outline" onClick={() => navigate('/events')}>
            View Events
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
