import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CompletedOrder {
  id: string;
  customer: string;
  email: string;
  phone: string;
  deliveredDate: string;
  amount: number;
  items: string[];
  feedbackSent: boolean;
  feedbackResponse?: CustomerFeedback;
  followUpSent: boolean;
  nextOrderScheduled?: string;
}

interface CustomerFeedback {
  orderId: string;
  rating: number; // 1-5 stars
  comments: string;
  wouldRecommend: boolean;
  favoriteItems: string[];
  suggestions: string;
  receivedAt: string;
}

interface FollowUpTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  daysAfter: number;
  includeDiscount: boolean;
  discountPercent?: number;
}

@Component({
  selector: 'app-customer-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-feedback.component.html',
  styleUrls: ['./customer-feedback.component.scss']
})
export class CustomerFeedbackComponent {
  selectedView: 'dashboard' | 'pending-feedback' | 'feedback-responses' | 'follow-up' = 'dashboard';

  // Mock data for completed orders
  completedOrders: CompletedOrder[] = [
    {
      id: 'ORD-001',
      customer: 'Sarah Wilson',
      email: 'sarah@email.com',
      phone: '(555) 123-4567',
      deliveredDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 275,
      items: ['Wedding Cake', 'Cupcakes x12'],
      feedbackSent: true,
      feedbackResponse: {
        orderId: 'ORD-001',
        rating: 5,
        comments: 'Absolutely amazing! The wedding cake was perfect and everyone loved the cupcakes.',
        wouldRecommend: true,
        favoriteItems: ['Wedding Cake', 'Cupcakes'],
        suggestions: 'Maybe offer mini cupcakes too!',
        receivedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      followUpSent: false
    },
    {
      id: 'ORD-002',
      customer: 'Mike Chen',
      email: 'mike@email.com', 
      phone: '(555) 234-5678',
      deliveredDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 42,
      items: ['Sourdough Bread x3', 'Jam x2'],
      feedbackSent: true,
      followUpSent: true,
      nextOrderScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ORD-003',
      customer: 'Emma Davis',
      email: 'emma@email.com',
      phone: '(555) 345-6789', 
      deliveredDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 95,
      items: ['Birthday Cake', 'Cookies x24'],
      feedbackSent: false,
      followUpSent: false
    }
  ];

  // Follow-up templates
  followUpTemplates: FollowUpTemplate[] = [
    {
      id: 'thank-you',
      name: 'Thank You (1 day)',
      subject: 'Thank you for your order!',
      content: 'Hi {{customer}}, thank you for choosing us! We hope you enjoyed your {{items}}. We\'d love to hear your feedback!',
      daysAfter: 1,
      includeDiscount: false
    },
    {
      id: 'feedback-request',
      name: 'Feedback Request (3 days)',
      subject: 'How was your recent order?',
      content: 'Hi {{customer}}, we hope you loved your recent order! Could you take a moment to share your thoughts? Click here to leave feedback.',
      daysAfter: 3,
      includeDiscount: false
    },
    {
      id: 'repeat-business',
      name: 'Repeat Business (7 days)',
      subject: 'Ready for your next delicious order?',
      content: 'Hi {{customer}}, it\'s been a week since your last order. Ready for more fresh baked goods? Use code WELCOME10 for 10% off your next order!',
      daysAfter: 7,
      includeDiscount: true,
      discountPercent: 10
    }
  ];

  // Statistics
  get totalCompleted() {
    return this.completedOrders.length;
  }

  get feedbackReceived() {
    return this.completedOrders.filter(o => o.feedbackResponse).length;
  }

  get averageRating() {
    const ratings = this.completedOrders
      .filter(o => o.feedbackResponse)
      .map(o => o.feedbackResponse!.rating);
    return ratings.length ? (ratings.reduce((a, b) => a + b) / ratings.length).toFixed(1) : '0';
  }

  get repeatCustomers() {
    return this.completedOrders.filter(o => o.nextOrderScheduled).length;
  }

  get pendingFeedback() {
    return this.completedOrders.filter(o => !o.feedbackSent && this.isDueForFeedback(o));
  }

  get pendingFollowUp() {
    return this.completedOrders.filter(o => o.feedbackResponse && !o.followUpSent);
  }

  get recentFeedback() {
    return this.completedOrders
      .filter(o => o.feedbackResponse)
      .sort((a, b) => new Date(b.feedbackResponse!.receivedAt).getTime() - new Date(a.feedbackResponse!.receivedAt).getTime())
      .slice(0, 5);
  }

  isDueForFeedback(order: CompletedOrder): boolean {
    const deliveredDate = new Date(order.deliveredDate);
    const daysSince = (Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 1; // Send feedback request after 1 day
  }

  sendFeedbackRequest(order: CompletedOrder) {
    // Mock sending feedback request
    order.feedbackSent = true;
    console.log(`📧 Feedback request sent to ${order.customer} (${order.email})`);
  }

  sendFollowUp(order: CompletedOrder, template: FollowUpTemplate) {
    // Mock sending follow-up
    order.followUpSent = true;
    const personalizedContent = template.content
      .replace('{{customer}}', order.customer)
      .replace('{{items}}', order.items.join(', '));
    
    console.log(`📧 Follow-up "${template.name}" sent to ${order.customer}: ${personalizedContent}`);
  }

  scheduleNextOrder(order: CompletedOrder) {
    // Mock scheduling next order
    order.nextOrderScheduled = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`📅 Next order scheduled for ${order.customer} in 2 weeks`);
  }

  getRatingStars(rating: number): string {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  getRecommendationText(wouldRecommend: boolean): string {
    return wouldRecommend ? '👍 Would recommend' : '👎 Would not recommend';
  }

  setView(view: 'dashboard' | 'pending-feedback' | 'feedback-responses' | 'follow-up') {
    this.selectedView = view;
  }
}