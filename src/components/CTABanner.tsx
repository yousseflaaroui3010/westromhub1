import { AlertTriangle } from 'lucide-react';

export function CTABanner() {
  return (
    <div className="bg-white rounded-xl shadow-[0_12px_32px_-4px_rgba(0,32,69,0.08)] border-l-4 border-secondary p-6 md:p-8 my-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -z-10" />
      
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 bg-secondary/10 p-3 rounded-full">
          <AlertTriangle className="w-8 h-8 text-secondary" />
        </div>
        
        <div>
          <h2 className="font-heading font-bold text-2xl text-primary mb-2">
            The 20% Rule: You Might Be Owed an Automatic Reduction
          </h2>
          <p className="text-on-surface-variant text-lg mb-4">
            Under Texas law, if your property's appraised value increased by more than <strong>20% year-over-year</strong>, you are entitled to an automatic free reduction. Many owners miss this and overpay.
          </p>
          
          <div className="bg-background rounded-lg p-4 border border-gray-100">
            <h3 className="font-semibold text-primary mb-2 uppercase tracking-wider text-sm">Action Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-on-surface-variant">
              <li>Check your recent Notice of Appraised Value.</li>
              <li>Compare this year's value to last year's value.</li>
              <li>If the increase is &gt;20%, file a protest immediately citing this rule.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
